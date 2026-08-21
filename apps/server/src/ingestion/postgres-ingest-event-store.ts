import type { SqlExecutor } from '@jabso/db'
import { fingerprintEvent, type IngestEventStore } from '../../../../domains/ingestion/server/public.js'
import type {
  IngestEventMutationInput,
  IngestEventMutationResult,
} from '../../../../domains/ingestion/shared/public.js'

type ProjectRow = { id: string }
type IssueRow = { id: string; event_count: number }
type EventRow = { id: string }

export class PostgresIngestEventStore implements IngestEventStore {
  constructor(private readonly database: SqlExecutor) {}

  async findProject(dsnProjectId: string, publicKey: string) {
    const result = await this.database.query<ProjectRow>(
      'select id from projects where dsn_project_id = $1 and public_key = $2 limit 1',
      [dsnProjectId, publicKey],
    )
    return result.rows[0]
  }

  async ingest(input: IngestEventMutationInput): Promise<IngestEventMutationResult> {
    const fingerprint = fingerprintEvent(input)
    const occurredAt = input.occurredAt ?? new Date().toISOString()

    return this.database.transaction(async (transaction) => {
      const issueResult = await transaction.query<IssueRow>(
        `insert into issues (
          project_id, fingerprint, title, level, event_count, first_seen_at, last_seen_at
        ) values ($1, $2, $3, $4, 0, $5, $5)
        on conflict (project_id, fingerprint) do update
          set title = excluded.title, level = excluded.level
        returning id, event_count`,
        [input.projectId, fingerprint, input.message ?? input.exceptionType ?? 'Unknown error', input.level, occurredAt],
      )
      const issue = issueResult.rows[0]
      if (!issue) throw new Error('Failed to create or find an issue')

      const eventResult = await transaction.query<EventRow>(
        `insert into events (
          event_id, project_id, issue_id, message, level, platform, environment,
          release, occurred_at, stacktrace, tags
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
        on conflict (project_id, event_id) do nothing
        returning id`,
        [
          input.eventId,
          input.projectId,
          issue.id,
          input.message ?? null,
          input.level,
          input.platform ?? null,
          input.environment ?? null,
          input.release ?? null,
          input.occurredAt ?? null,
          JSON.stringify(input.stacktrace),
          JSON.stringify(input.tags),
        ],
      )

      if (eventResult.rows[0]) {
        await transaction.query(
          `update issues set
            event_count = event_count + 1,
            first_seen_at = least(first_seen_at, $2),
            last_seen_at = greatest(last_seen_at, $2)
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
