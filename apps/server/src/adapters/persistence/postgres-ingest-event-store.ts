import type { SqlExecutor } from '@jabso/db'
import { fingerprintEvent, type IngestEventStore } from '@domains/ingestion/server/public.js'
import type {
  IngestEventMutationInput,
  IngestEventMutationResult,
} from '@domains/ingestion/shared/public.js'

type ProjectRow = { id: string; workspace_id: string | null }
type IssueRow = {
  id: string
  event_count: number
  status: 'unresolved' | 'resolved' | 'ignored'
  resolved_at: string | Date | null
}
type EventRow = { id: string }
type ReleaseRow = { id: string }

export class PostgresIngestEventStore implements IngestEventStore {
  constructor(private readonly database: SqlExecutor) {}

  async findProject(dsnProjectId: string, publicKey: string) {
    const result = await this.database.query<ProjectRow>(
      'select id, workspace_id from projects where dsn_project_id = $1 and public_key = $2 and deleted_at is null limit 1',
      [dsnProjectId, publicKey],
    )
    return result.rows[0]
  }

  async findProjectByDsnProjectId(dsnProjectId: string) {
    const result = await this.database.query<ProjectRow>(
      'select id, workspace_id from projects where dsn_project_id = $1 and deleted_at is null limit 1',
      [dsnProjectId],
    )
    return result.rows[0]
  }

  async ingest(input: IngestEventMutationInput): Promise<IngestEventMutationResult> {
    const fingerprint = fingerprintEvent(input)
    const occurredAt = input.occurredAt ?? new Date().toISOString()

    return this.database.transaction(async (transaction) => {
      const issueResult = await transaction.query<IssueRow>(
        `insert into issues (
          project_id, fingerprint, title, exception_type, level, event_count, first_seen_at, last_seen_at
        ) values ($1, $2, $3, $4, $5, 0, $6, $6)
        on conflict (project_id, fingerprint) do update
          set title = excluded.title, exception_type = excluded.exception_type, level = excluded.level
        returning id, event_count, status, resolved_at`,
        [
          input.projectId,
          fingerprint,
          input.message ?? input.exceptionType ?? 'Unknown error',
          input.exceptionType ?? null,
          input.level,
          occurredAt,
        ],
      )
      const issue = issueResult.rows[0]
      if (!issue) throw new Error('Failed to create or find an issue')

      const normalizedDist = input.dist ?? ''
      const release = input.release
        ? (await transaction.query<ReleaseRow>(
            `insert into releases (project_id, version, dist)
             values ($1, $2, $3)
             on conflict (project_id, version, dist) do update set version = excluded.version
             returning id`,
            [input.projectId, input.release, normalizedDist],
          )).rows[0]
        : undefined
      const symbolicationStatus = release && input.stacktrace.length > 0 ? 'pending' : 'not_applicable'

      const eventResult = await transaction.query<EventRow>(
        `insert into events (
          event_id, project_id, issue_id, message, exception_type, level, platform, environment,
          release, dist, release_id, occurred_at, stacktrace, symbolication_status, tags, breadcrumbs, context
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text::jsonb,
          $14::symbolication_status, $15::text::jsonb, $16::text::jsonb, $17::text::jsonb
        )
        on conflict (project_id, event_id) do nothing
        returning id`,
        [
          input.eventId,
          input.projectId,
          issue.id,
          input.message ?? null,
          input.exceptionType ?? null,
          input.level,
          input.platform ?? null,
          input.environment ?? null,
          input.release ?? null,
          input.dist ?? null,
          release?.id ?? null,
          input.occurredAt ?? null,
          JSON.stringify(input.stacktrace),
          symbolicationStatus,
          JSON.stringify(input.tags),
          JSON.stringify(input.breadcrumbs),
          JSON.stringify(input.context),
        ],
      )

      if (eventResult.rows[0]) {
        if (release) {
          await transaction.query(
            `insert into issue_releases (
              issue_id, release_id, event_count, first_seen_at, last_seen_at,
              previous_resolved_at, regressed_at
            ) values ($1, $2, 1, $3, $3, $4, $5)
            on conflict (issue_id, release_id) do update set
              event_count = issue_releases.event_count + 1,
              first_seen_at = least(issue_releases.first_seen_at, excluded.first_seen_at),
              last_seen_at = greatest(issue_releases.last_seen_at, excluded.last_seen_at),
              previous_resolved_at = coalesce(excluded.previous_resolved_at, issue_releases.previous_resolved_at),
              regressed_at = coalesce(excluded.regressed_at, issue_releases.regressed_at)`,
            [
              issue.id,
              release.id,
              occurredAt,
              issue.status === 'resolved' ? issue.resolved_at : null,
              issue.status === 'resolved' ? occurredAt : null,
            ],
          )
        }
        await transaction.query(
          `update issues set
            event_count = event_count + 1,
            first_seen_at = least(first_seen_at, $2),
            last_seen_at = greatest(last_seen_at, $2),
            status = case when status = 'resolved' then 'unresolved'::issue_status else status end,
            status_changed_at = case when status = 'resolved' then $2 else status_changed_at end,
            regressed_at = case when status = 'resolved' then $2 else regressed_at end,
            resolved_at = case when status = 'resolved' then null else resolved_at end
          where id = $1`,
          [issue.id, occurredAt],
        )
      }

      return {
        eventId: input.eventId,
        issueId: issue.id,
        isNewIssue: issue.event_count === 0 && Boolean(eventResult.rows[0]),
      }
    })
  }
}
