import { afterEach, describe, expect, it } from 'vitest'
import { createPostgresBoundraDiagnosticSink } from '../src/adapters/persistence/postgres-boundra-diagnostic-sink.js'
import { createTestDatabase } from './pglite.js'

const databases: Array<{ close: () => Promise<void> }> = []

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()))
})

describe('createPostgresBoundraDiagnosticSink', () => {
  it('persists JSONB fields and removes at most 100 diagnostics older than 30 days', async () => {
    const { database, executor } = await createTestDatabase()
    databases.push(database)
    await executor.query(
      `insert into internal_diagnostics
        (id, kind, message, boundra_version, occurred_at)
       select
         (lpad(number::text, 8, '0') || '-0000-4000-8000-000000000000')::uuid,
         'unexpected', 'expired diagnostic', '0.5.0', $1
       from generate_series(1, 101) as number`,
      ['2020-01-01T00:00:00.000Z'],
    )

    const sink = createPostgresBoundraDiagnosticSink(executor)
    await sink({
      id: 'c721d311-ad3f-4d58-984c-ce7f6cf1ccb2',
      kind: 'runtime_contract',
      code: 'RUNTIME-001',
      message: 'contract rejected input',
      contract: 'ingest-event',
      operation: 'route',
      issues: [{ path: ['eventId', 0], message: 'required' }],
      context: { phase: 'input', attempt: 1 },
      boundraVersion: '0.5.0',
      jabsoVersion: '0.1.0',
      occurredAt: '2026-09-04T00:00:00.000Z',
    })

    const result = await executor.query<{
      id: string
      issues: unknown
      context: unknown
    }>(
      `select id, issues, context from internal_diagnostics
       order by occurred_at, id`,
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.at(-1)).toEqual({
      id: 'c721d311-ad3f-4d58-984c-ce7f6cf1ccb2',
      issues: [{ path: ['eventId', 0], message: 'required' }],
      context: { phase: 'input', attempt: 1 },
    })
  })
})
