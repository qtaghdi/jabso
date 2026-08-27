import type { SqlExecutor } from '@jabso/db'
import {
  normalizeArtifactPath,
  sourceMapPathForFrame,
  symbolicateStacktrace,
  validateSourceMap,
  type StackFrame,
} from '@jabso/symbolication'
import type { ReleaseStore } from '@jabso/domain-release/server'
import type {
  GetReleaseRegressionsQueryInput,
  GetReleaseRegressionsQueryResult,
  ListReleasesQueryInput,
  ListReleasesQueryResult,
  RetryReleaseSymbolicationMutationInput,
  RetryReleaseSymbolicationMutationResult,
  UploadSourceMapMutationInput,
  UploadSourceMapMutationResult,
} from '@jabso/domain-release/shared'
import { createHash } from 'node:crypto'

type Timestamp = string | Date
type SymbolicationStatus = 'not_applicable' | 'pending' | 'completed' | 'missing' | 'failed'

type ReleaseRow = {
  id: string
  version: string
  dist: string
  deployed_at: Timestamp | null
  created_at: Timestamp
  artifact_count: number
  event_count: number
}

type ArtifactRow = {
  id: string
  path: string
  content: Uint8Array
}

type EventRow = {
  id: string
  release_id: string | null
  stacktrace: unknown
}

type RegressionRow = {
  issue_id: string
  title: string
  dist: string
  previous_resolved_at: Timestamp
  regressed_at: Timestamp
}

const maxSourceMapBytes = 5 * 1024 * 1024
const maxArtifactsPerRelease = 50

const toIsoString = (value: Timestamp) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const decodeArtifact = (content: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(content)

const toStackFrames = (value: unknown): StackFrame[] => {
  let parsed = value
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((frame): frame is StackFrame => Boolean(frame) && typeof frame === 'object').slice(0, 200)
}

const emptyRetryResult = (): RetryReleaseSymbolicationMutationResult => ({
  releaseId: null,
  processedEventCount: 0,
  completedEventCount: 0,
  missingEventCount: 0,
  failedEventCount: 0,
  pendingEventCount: 0,
})

export class SourceMapUploadError extends Error {
  constructor(readonly code: 'invalid_path' | 'invalid_source_map' | 'too_large' | 'artifact_limit') {
    super({
      invalid_path: 'Source map artifact path is invalid',
      invalid_source_map: 'Source map content is invalid',
      too_large: 'Source map exceeds the decoded byte limit',
      artifact_limit: 'Release source map artifact limit exceeded',
    }[code])
    this.name = 'SourceMapUploadError'
  }
}

export class PostgresReleaseStore implements ReleaseStore {
  constructor(private readonly database: SqlExecutor) {}

  async list(input: ListReleasesQueryInput): Promise<ListReleasesQueryResult> {
    const result = await this.database.query<ReleaseRow>(
      `select release.id, release.version, release.dist, release.deployed_at, release.created_at,
        (select count(*)::int from source_map_artifacts as artifact where artifact.release_id = release.id) as artifact_count,
        (select count(*)::int from events as event where event.release_id = release.id) as event_count
       from releases as release
       where release.project_id = $1
       order by coalesce(release.deployed_at, release.created_at) desc, release.id desc
       limit $2`,
      [input.projectId, input.limit],
    )
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        version: row.version,
        dist: row.dist,
        deployedAt: row.deployed_at ? toIsoString(row.deployed_at) : null,
        createdAt: toIsoString(row.created_at),
        artifactCount: row.artifact_count,
        eventCount: row.event_count,
      })),
    }
  }

  async regressions(
    input: GetReleaseRegressionsQueryInput,
  ): Promise<GetReleaseRegressionsQueryResult> {
    const result = await this.database.query<RegressionRow>(
      `select issue.id as issue_id, issue.title, release.dist,
        issue_release.previous_resolved_at, issue_release.regressed_at
       from issue_releases as issue_release
       join releases as release on release.id = issue_release.release_id
       join issues as issue on issue.id = issue_release.issue_id
       where release.project_id = $1 and release.version = $2 and release.dist = $3
         and issue_release.previous_resolved_at is not null
         and issue_release.regressed_at is not null
       order by issue_release.regressed_at desc, issue.id desc
       limit $4`,
      [input.projectId, input.release, input.dist, input.limit],
    )
    return {
      items: result.rows.map((row) => ({
        issueId: row.issue_id,
        title: row.title,
        dist: row.dist,
        previousResolvedAt: toIsoString(row.previous_resolved_at),
        regressedAt: toIsoString(row.regressed_at),
      })),
    }
  }

  async uploadSourceMap(input: UploadSourceMapMutationInput): Promise<UploadSourceMapMutationResult> {
    const artifactPath = normalizeArtifactPath(input.artifactPath)
    if (!artifactPath || !artifactPath.endsWith('.map')) throw new SourceMapUploadError('invalid_path')

    const contentBytes = Buffer.from(input.content, 'utf8')
    if (contentBytes.byteLength > maxSourceMapBytes) throw new SourceMapUploadError('too_large')
    try {
      validateSourceMap(input.content)
    } catch {
      throw new SourceMapUploadError('invalid_source_map')
    }
    const checksum = createHash('sha256').update(contentBytes).digest('hex')

    const stored = await this.database.transaction(async (transaction) => {
      const release = (await transaction.query<{ id: string }>(
        `insert into releases (project_id, version, dist, deployed_at)
         values ($1, $2, $3, $4)
         on conflict (project_id, version, dist) do update set
           deployed_at = coalesce(excluded.deployed_at, releases.deployed_at)
         returning id`,
        [input.projectId, input.version, input.dist, input.deployedAt ?? null],
      )).rows[0]
      if (!release) throw new Error('Failed to create or find release')

      const existing = await transaction.query<{ id: string }>(
        'select id from source_map_artifacts where release_id = $1 and path = $2 limit 1',
        [release.id, artifactPath],
      )
      if (!existing.rows[0]) {
        const count = await transaction.query<{ count: number }>(
          'select count(*)::int as count from source_map_artifacts where release_id = $1',
          [release.id],
        )
        if ((count.rows[0]?.count ?? 0) >= maxArtifactsPerRelease) {
          throw new SourceMapUploadError('artifact_limit')
        }
      }

      const artifact = (await transaction.query<{ id: string }>(
        `insert into source_map_artifacts (release_id, path, checksum, content, byte_size)
         values ($1, $2, $3, $4, $5)
         on conflict (release_id, path) do update set
           checksum = excluded.checksum,
           content = excluded.content,
           byte_size = excluded.byte_size,
           updated_at = now()
         returning id`,
        [release.id, artifactPath, checksum, contentBytes, contentBytes.byteLength],
      )).rows[0]
      if (!artifact) throw new Error('Failed to store source map artifact')

      await transaction.query(
        `update events set symbolication_status = 'pending', symbolication_error_code = null
         where release_id = $1 and jsonb_array_length(case
           when stacktrace is null then '[]'::jsonb
           when jsonb_typeof(stacktrace) = 'string' then (stacktrace #>> '{}')::jsonb
           else stacktrace
         end) > 0`,
        [release.id],
      )
      return { releaseId: release.id, artifactId: artifact.id }
    })

    const processed = await this.processPending(input.projectId, stored.releaseId, 100)
    return {
      ...stored,
      artifactPath,
      checksum,
      byteSize: contentBytes.byteLength,
      processedEventCount: processed.processedEventCount,
      completedEventCount: processed.completedEventCount,
      pendingEventCount: processed.pendingEventCount,
    }
  }

  async retrySymbolication(
    input: RetryReleaseSymbolicationMutationInput,
  ): Promise<RetryReleaseSymbolicationMutationResult> {
    const release = (await this.database.query<{ id: string }>(
      'select id from releases where project_id = $1 and version = $2 and dist = $3 limit 1',
      [input.projectId, input.version, input.dist],
    )).rows[0]
    if (!release) return emptyRetryResult()

    await this.database.query(
      `update events set symbolication_status = 'pending', symbolication_error_code = null
       where release_id = $1 and symbolication_status in ('missing', 'failed')`,
      [release.id],
    )
    return this.processPending(input.projectId, release.id, input.limit)
  }

  async symbolicateEvent(projectId: string, eventId: string): Promise<SymbolicationStatus | null> {
    const event = (await this.database.query<EventRow>(
      `select id, release_id, stacktrace
       from events where project_id = $1 and event_id = $2 limit 1`,
      [projectId, eventId],
    )).rows[0]
    if (!event) return null
    return this.symbolicateStoredEvent(projectId, event)
  }

  private async processPending(
    projectId: string,
    releaseId: string,
    limit: number,
  ): Promise<RetryReleaseSymbolicationMutationResult> {
    const pending = await this.database.query<EventRow>(
      `select id, release_id, stacktrace from events
       where project_id = $1 and release_id = $2 and symbolication_status = 'pending'
       order by received_at asc, id asc limit $3`,
      [projectId, releaseId, limit],
    )
    const counts = { completed: 0, missing: 0, failed: 0 }
    for (const event of pending.rows) {
      const status = await this.symbolicateStoredEvent(projectId, event)
      if (status === 'completed' || status === 'missing' || status === 'failed') counts[status] += 1
    }
    const remaining = await this.database.query<{ count: number }>(
      `select count(*)::int as count from events
       where project_id = $1 and release_id = $2 and symbolication_status = 'pending'`,
      [projectId, releaseId],
    )
    return {
      releaseId,
      processedEventCount: pending.rows.length,
      completedEventCount: counts.completed,
      missingEventCount: counts.missing,
      failedEventCount: counts.failed,
      pendingEventCount: remaining.rows[0]?.count ?? 0,
    }
  }

  private async symbolicateStoredEvent(
    projectId: string,
    event: EventRow,
  ): Promise<SymbolicationStatus> {
    const frames = toStackFrames(event.stacktrace)
    if (!event.release_id || frames.length === 0) {
      await this.updateSymbolication(projectId, event.id, 'not_applicable', null, null)
      return 'not_applicable'
    }

    const paths = [...new Set(frames.flatMap((frame) => {
      const path = frame.filename ? sourceMapPathForFrame(frame.filename) : null
      return path ? [path] : []
    }))]
    if (paths.length === 0) {
      await this.updateSymbolication(projectId, event.id, 'missing', null, 'artifact_path_missing')
      return 'missing'
    }

    const placeholders = paths.map((_, index) => `$${index + 2}`).join(', ')
    const artifacts = await this.database.query<ArtifactRow>(
      `select id, path, content from source_map_artifacts
       where release_id = $1 and path in (${placeholders})`,
      [event.release_id, ...paths],
    )
    if (artifacts.rows.length === 0) {
      await this.updateSymbolication(projectId, event.id, 'missing', null, 'source_map_not_found')
      return 'missing'
    }

    try {
      const result = symbolicateStacktrace(
        frames,
        artifacts.rows.map((artifact) => ({
          path: artifact.path,
          content: decodeArtifact(artifact.content),
        })),
      )
      if (result.mappedFrameCount === 0) {
        await this.updateSymbolication(projectId, event.id, 'missing', null, 'mapping_not_found')
        return 'missing'
      }
      await this.updateSymbolication(projectId, event.id, 'completed', result.frames, null)
      return 'completed'
    } catch {
      await this.updateSymbolication(projectId, event.id, 'failed', null, 'source_map_processing_failed')
      return 'failed'
    }
  }

  private async updateSymbolication(
    projectId: string,
    eventId: string,
    status: SymbolicationStatus,
    frames: StackFrame[] | null,
    errorCode: string | null,
  ) {
    await this.database.query(
      `update events set
        symbolication_status = $3::symbolication_status,
        symbolicated_stacktrace = $4::text::jsonb,
        symbolication_error_code = $5,
        symbolicated_at = case when $3 = 'completed' then now() else null end
       where project_id = $1 and id = $2`,
      [projectId, eventId, status, frames ? JSON.stringify(frames) : null, errorCode],
    )
  }
}
