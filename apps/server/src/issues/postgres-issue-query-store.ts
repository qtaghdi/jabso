import type { SqlExecutor } from '@jabso/db'
import type { IssueQueryStore } from '../../../../domains/issue/server/public.js'
import type {
  GetIssueFacetsQueryResult,
  GetIssueQueryInput,
  GetIssueQueryResult,
  SearchIssuesQueryInput,
  SearchIssuesQueryResult,
  UpdateIssueStatusMutationInput,
  UpdateIssueStatusMutationResult,
} from '../../../../domains/issue/shared/public.js'

type Timestamp = string | Date
type IssueStatus = 'unresolved' | 'resolved' | 'ignored'
type StackFrame = { filename?: string; function?: string; line?: number; column?: number; inApp?: boolean }
type Breadcrumb = { timestamp?: string; category: string; level?: string; message?: string }

type IssueSummaryRow = {
  id: string
  project_id: string
  title: string
  exception_type: string | null
  level: string
  status: IssueStatus
  event_count: number
  first_seen_at: Timestamp
  last_seen_at: Timestamp
  regressed_at: Timestamp | null
  environment: string | null
  release: string | null
}

type IssueDetailRow = IssueSummaryRow & {
  fingerprint: string
  status_changed_at: Timestamp
  resolved_at: Timestamp | null
  event_id: string | null
  event_message: string | null
  event_exception_type: string | null
  platform: string | null
  dist: string | null
  occurred_at: Timestamp | null
  received_at: Timestamp | null
  stacktrace: StackFrame[] | null
  symbolicated_stacktrace: StackFrame[] | null
  symbolication_status: 'not_applicable' | 'pending' | 'completed' | 'missing' | 'failed'
  symbolication_error_code: string | null
  symbolicated_at: Timestamp | null
  tags: Record<string, string> | null
  breadcrumbs: Breadcrumb[] | null
  context: Record<string, string> | null
}

type OccurrenceRow = {
  event_id: string
  level: string
  environment: string | null
  release: string | null
  occurred_at: Timestamp | null
  received_at: Timestamp
}

type IssueReleaseRow = {
  version: string
  dist: string
  event_count: number
  first_seen_at: Timestamp
  last_seen_at: Timestamp
  previous_resolved_at: Timestamp | null
  regressed_at: Timestamp | null
}

type FacetRow = { value: string }
type Cursor = { lastSeenAt: string; id: string }

const toIsoString = (value: Timestamp) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const encodeCursor = (row: Pick<IssueSummaryRow, 'id' | 'last_seen_at'>) =>
  Buffer.from(JSON.stringify({ lastSeenAt: toIsoString(row.last_seen_at), id: row.id })).toString('base64url')

const decodeCursor = (value: string | undefined): Cursor | null => {
  if (!value) return null
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<Cursor>
    if (!cursor.lastSeenAt || !cursor.id || !Number.isFinite(new Date(cursor.lastSeenAt).getTime())) return null
    return { lastSeenAt: cursor.lastSeenAt, id: cursor.id }
  } catch {
    return null
  }
}

const mapIssueSummary = (row: IssueSummaryRow) => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  exceptionType: row.exception_type,
  level: row.level,
  status: row.status,
  eventCount: row.event_count,
  firstSeenAt: toIsoString(row.first_seen_at),
  lastSeenAt: toIsoString(row.last_seen_at),
  regressedAt: row.regressed_at ? toIsoString(row.regressed_at) : null,
  environment: row.environment,
  release: row.release,
})

const baseSearchSql = `select
  issue.id, issue.project_id, issue.title, issue.exception_type, issue.level, issue.status,
  issue.event_count, issue.first_seen_at, issue.last_seen_at, issue.regressed_at,
  latest.environment, latest.release
from issues as issue
left join lateral (
  select event.environment, event.release from events as event
  where event.issue_id = issue.id order by event.received_at desc, event.id desc limit 1
) as latest on true
where issue.project_id = $1
  and ($2::text is null or issue.status::text = $2)
  and ($3::text is null or issue.level = $3)
  and ($4::text is null or issue.title ilike '%' || $4 || '%' or issue.exception_type ilike '%' || $4 || '%')
  and ($5::text is null or latest.environment = $5)
  and ($6::text is null or latest.release = $6)
  and ($7::timestamptz is null or issue.last_seen_at >= $7)
  and ($8::timestamptz is null or (issue.last_seen_at, issue.id)`

const nextSearchSql = `${baseSearchSql} < ($8, $9::uuid))
order by issue.last_seen_at desc, issue.id desc limit $10`

const previousSearchSql = `${baseSearchSql} > ($8, $9::uuid))
order by issue.last_seen_at asc, issue.id asc limit $10`

const mapOccurrence = (row: OccurrenceRow) => ({
  eventId: row.event_id,
  level: row.level,
  environment: row.environment,
  release: row.release,
  occurredAt: row.occurred_at ? toIsoString(row.occurred_at) : null,
  receivedAt: toIsoString(row.received_at),
})

export const createPostgresIssueQueryStore = (database: SqlExecutor): IssueQueryStore => ({
  search: async (input: SearchIssuesQueryInput): Promise<SearchIssuesQueryResult> => {
    const cursor = decodeCursor(input.cursor)
    const isPrevious = input.direction === 'previous'
    const result = await database.query<IssueSummaryRow>(isPrevious ? previousSearchSql : nextSearchSql, [
      input.projectId,
      input.status ?? null,
      input.level ?? null,
      input.query ?? null,
      input.environment ?? null,
      input.release ?? null,
      input.lastSeenAfter ?? null,
      cursor?.lastSeenAt ?? null,
      cursor?.id ?? null,
      input.limit + 1,
    ])
    const hasMore = result.rows.length > input.limit
    const pageRows = result.rows.slice(0, input.limit)
    if (isPrevious) pageRows.reverse()
    const items = pageRows.map(mapIssueSummary)
    const firstRow = pageRows[0]
    const lastRow = pageRows.at(-1)
    return {
      items,
      previousCursor: isPrevious
        ? hasMore && firstRow ? encodeCursor(firstRow) : null
        : cursor && firstRow ? encodeCursor(firstRow) : null,
      nextCursor: isPrevious
        ? cursor && lastRow ? encodeCursor(lastRow) : null
        : hasMore && lastRow ? encodeCursor(lastRow) : null,
    }
  },

  facets: async (input): Promise<GetIssueFacetsQueryResult> => {
    const [levels, environments, releases] = await Promise.all([
      database.query<FacetRow>(
        'select distinct level as value from issues where project_id = $1 order by value limit 50',
        [input.projectId],
      ),
      database.query<FacetRow>(
        'select distinct environment as value from events where project_id = $1 and environment is not null order by value limit 100',
        [input.projectId],
      ),
      database.query<FacetRow>(
        'select distinct release as value from events where project_id = $1 and release is not null order by value desc limit 100',
        [input.projectId],
      ),
    ])
    return {
      levels: levels.rows.map((row) => row.value),
      environments: environments.rows.map((row) => row.value),
      releases: releases.rows.map((row) => row.value),
    }
  },

  get: async (input: GetIssueQueryInput): Promise<GetIssueQueryResult> => {
    const [detail, occurrences, releaseHistory] = await Promise.all([
      database.query<IssueDetailRow>(
        `select
          issue.id, issue.project_id, issue.fingerprint, issue.title, issue.exception_type,
          issue.level, issue.status, issue.event_count, issue.first_seen_at, issue.last_seen_at,
          issue.status_changed_at, issue.resolved_at, issue.regressed_at,
          latest.event_id, latest.message as event_message,
          latest.exception_type as event_exception_type, latest.platform, latest.environment,
          latest.release, latest.dist, latest.occurred_at, latest.received_at, latest.stacktrace,
          latest.symbolicated_stacktrace, latest.symbolication_status,
          latest.symbolication_error_code, latest.symbolicated_at, latest.tags,
          latest.breadcrumbs, latest.context
        from issues as issue
        left join lateral (
          select event.* from events as event where event.issue_id = issue.id
          order by event.received_at desc, event.id desc limit 1
        ) as latest on true
        where issue.project_id = $1 and issue.id = $2 limit 1`,
        [input.projectId, input.issueId],
      ),
      database.query<OccurrenceRow>(
        `select event_id, level, environment, release, occurred_at, received_at
         from events where project_id = $1 and issue_id = $2
         order by received_at desc, id desc limit 25`,
        [input.projectId, input.issueId],
      ),
      database.query<IssueReleaseRow>(
        `select release.version, release.dist, issue_release.event_count,
          issue_release.first_seen_at, issue_release.last_seen_at,
          issue_release.previous_resolved_at, issue_release.regressed_at
         from issue_releases as issue_release
         join releases as release on release.id = issue_release.release_id
         join issues as issue on issue.id = issue_release.issue_id
         where issue.project_id = $1 and issue.id = $2
         order by issue_release.last_seen_at desc, release.id desc limit 25`,
        [input.projectId, input.issueId],
      ),
    ])
    const row = detail.rows[0]
    if (!row) return null

    return {
      id: row.id,
      projectId: row.project_id,
      fingerprint: row.fingerprint,
      title: row.title,
      exceptionType: row.exception_type,
      level: row.level,
      status: row.status,
      eventCount: row.event_count,
      firstSeenAt: toIsoString(row.first_seen_at),
      lastSeenAt: toIsoString(row.last_seen_at),
      statusChangedAt: toIsoString(row.status_changed_at),
      resolvedAt: row.resolved_at ? toIsoString(row.resolved_at) : null,
      regressedAt: row.regressed_at ? toIsoString(row.regressed_at) : null,
      occurrences: occurrences.rows.map(mapOccurrence),
      releaseHistory: releaseHistory.rows.map((release) => ({
        release: release.version,
        dist: release.dist,
        eventCount: release.event_count,
        firstSeenAt: toIsoString(release.first_seen_at),
        lastSeenAt: toIsoString(release.last_seen_at),
        previousResolvedAt: release.previous_resolved_at
          ? toIsoString(release.previous_resolved_at)
          : null,
        regressedAt: release.regressed_at ? toIsoString(release.regressed_at) : null,
      })),
      latestEvent: row.event_id && row.received_at
        ? {
            eventId: row.event_id,
            message: row.event_message,
            exceptionType: row.event_exception_type,
            platform: row.platform,
            environment: row.environment,
            release: row.release,
            dist: row.dist,
            occurredAt: row.occurred_at ? toIsoString(row.occurred_at) : null,
            receivedAt: toIsoString(row.received_at),
            stacktrace: row.symbolicated_stacktrace ?? row.stacktrace ?? [],
            originalStacktrace: row.stacktrace ?? [],
            symbolication: {
              status: row.symbolication_status,
              errorCode: row.symbolication_error_code,
              mappedAt: row.symbolicated_at ? toIsoString(row.symbolicated_at) : null,
            },
            tags: row.tags ?? {},
            breadcrumbs: row.breadcrumbs ?? [],
            context: row.context ?? {},
          }
        : null,
    }
  },

  updateStatus: async (input: UpdateIssueStatusMutationInput): Promise<UpdateIssueStatusMutationResult> => {
    const changedAt = new Date().toISOString()
    const result = await database.query<{ id: string; status: IssueStatus }>(
      `update issues set
        status = $3::issue_status,
        status_changed_at = $4::timestamptz,
        resolved_at = case when $3 = 'resolved' then $4::timestamptz else null end,
        regressed_at = case when $3 = 'unresolved' then regressed_at else null end
       where project_id = $1 and id = $2 returning id, status`,
      [input.projectId, input.issueId, input.status, changedAt],
    )
    const issue = result.rows[0]
    return issue ? { issueId: issue.id, status: issue.status, changedAt } : null
  },
})
