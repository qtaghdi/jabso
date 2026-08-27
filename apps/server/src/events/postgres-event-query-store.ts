import type { SqlExecutor } from '@jabso/db'
import type { EventQueryStore } from '../../../../domains/event/server/public.js'

type EventRow = {
  id: string
  event_id: string
  issue_id: string
  message: string | null
  level: string
  platform: string | null
  environment: string | null
  release: string | null
  occurred_at: Date | string | null
  received_at: Date | string
  stacktrace: unknown
  symbolicated_stacktrace: unknown
  tags: unknown
}

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

const stackFrames = (value: unknown) => {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const frame = candidate as Record<string, unknown>
    return [{
      ...(typeof frame.filename === 'string' ? { filename: frame.filename } : {}),
      ...(typeof frame.function === 'string' ? { function: frame.function } : {}),
      ...(typeof frame.line === 'number' && Number.isInteger(frame.line) && frame.line >= 0 ? { line: frame.line } : {}),
      ...(typeof frame.column === 'number' && Number.isInteger(frame.column) && frame.column >= 0 ? { column: frame.column } : {}),
      ...(typeof frame.inApp === 'boolean' ? { inApp: frame.inApp } : {}),
    }]
  }).slice(0, 200)
}

const stringRecord = (value: unknown): Record<string, string> => {
  const parsed = parseJson(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

const iso = (value: Date | string) => new Date(value).toISOString()

export const createPostgresEventQueryStore = (database: SqlExecutor): EventQueryStore => ({
  get: async (input) => {
    const row = (await database.query<EventRow>(
      `select id, event_id, issue_id, message, level, platform, environment, release,
        occurred_at, received_at, stacktrace, symbolicated_stacktrace, tags
       from events where project_id = $1 and event_id = $2 limit 1`,
      [input.projectId, input.eventId],
    )).rows[0]
    if (!row) return null
    return {
      id: row.id,
      eventId: row.event_id,
      issueId: row.issue_id,
      message: row.message,
      level: row.level,
      platform: row.platform,
      environment: row.environment,
      release: row.release,
      occurredAt: row.occurred_at ? iso(row.occurred_at) : null,
      receivedAt: iso(row.received_at),
      stacktrace: stackFrames(row.symbolicated_stacktrace ?? row.stacktrace),
      tags: stringRecord(row.tags),
    }
  },
})
