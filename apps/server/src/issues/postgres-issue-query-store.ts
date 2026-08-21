import type { SqlExecutor } from '@jabso/db'
import type { IssueQueryStore } from '../../../../domains/issue/server/public.js'
import type {
  GetIssueQueryInput,
  GetIssueQueryResult,
  SearchIssuesQueryInput,
  SearchIssuesQueryResult,
} from '../../../../domains/issue/shared/public.js'

type Timestamp = string | Date
type StackFrame = {
  filename?: string
  function?: string
  line?: number
  column?: number
  inApp?: boolean
}

type IssueSummaryRow = {
  id: string
  project_id: string
  title: string
  exception_type: string | null
  level: string
  status: 'unresolved' | 'resolved' | 'ignored'
  event_count: number
  first_seen_at: Timestamp
  last_seen_at: Timestamp
  environment: string | null
  release: string | null
}

type IssueDetailRow = IssueSummaryRow & {
  fingerprint: string
  event_id: string | null
  event_message: string | null
  event_exception_type: string | null
  platform: string | null
  occurred_at: Timestamp | null
  received_at: Timestamp | null
  stacktrace: StackFrame[] | null
  tags: Record<string, string> | null
}

const toIsoString = (value: Timestamp) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

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
  environment: row.environment,
  release: row.release,
})

export const createPostgresIssueQueryStore = (database: SqlExecutor): IssueQueryStore => ({
  search: async (input: SearchIssuesQueryInput): Promise<SearchIssuesQueryResult> => {
    const result = await database.query<IssueSummaryRow>(
      `select
        issue.id,
        issue.project_id,
        issue.title,
        issue.exception_type,
        issue.level,
        issue.status,
        issue.event_count,
        issue.first_seen_at,
        issue.last_seen_at,
        latest.environment,
        latest.release
      from issues as issue
      left join lateral (
        select event.environment, event.release
        from events as event
        where event.issue_id = issue.id
        order by event.received_at desc, event.id desc
        limit 1
      ) as latest on true
      where issue.project_id = $1
        and ($2::text is null or issue.status::text = $2)
        and ($3::text is null or issue.title ilike '%' || $3 || '%')
        and ($4::text is null or latest.environment = $4)
        and ($5::text is null or latest.release = $5)
        and ($6::timestamptz is null or issue.last_seen_at < $6)
      order by issue.last_seen_at desc, issue.id desc
      limit $7`,
      [
        input.projectId,
        input.status ?? null,
        input.query ?? null,
        input.environment ?? null,
        input.release ?? null,
        input.cursor ?? null,
        input.limit + 1,
      ],
    )
    const hasNextPage = result.rows.length > input.limit
    const items = result.rows.slice(0, input.limit).map(mapIssueSummary)
    return {
      items,
      nextCursor: hasNextPage ? items.at(-1)?.lastSeenAt ?? null : null,
    }
  },

  get: async (input: GetIssueQueryInput): Promise<GetIssueQueryResult> => {
    const result = await database.query<IssueDetailRow>(
      `select
        issue.id,
        issue.project_id,
        issue.fingerprint,
        issue.title,
        issue.exception_type,
        issue.level,
        issue.status,
        issue.event_count,
        issue.first_seen_at,
        issue.last_seen_at,
        latest.event_id,
        latest.message as event_message,
        latest.exception_type as event_exception_type,
        latest.platform,
        latest.environment,
        latest.release,
        latest.occurred_at,
        latest.received_at,
        latest.stacktrace,
        latest.tags
      from issues as issue
      left join lateral (
        select event.*
        from events as event
        where event.issue_id = issue.id
        order by event.received_at desc, event.id desc
        limit 1
      ) as latest on true
      where issue.project_id = $1 and issue.id = $2
      limit 1`,
      [input.projectId, input.issueId],
    )
    const row = result.rows[0]
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
      latestEvent: row.event_id && row.received_at
        ? {
            eventId: row.event_id,
            message: row.event_message,
            exceptionType: row.event_exception_type,
            platform: row.platform,
            environment: row.environment,
            release: row.release,
            occurredAt: row.occurred_at ? toIsoString(row.occurred_at) : null,
            receivedAt: toIsoString(row.received_at),
            stacktrace: row.stacktrace ?? [],
            tags: row.tags ?? {},
          }
        : null,
    }
  },
})
