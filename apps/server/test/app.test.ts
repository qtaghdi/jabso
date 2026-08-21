import { describe, expect, it } from 'vitest'
import { buildServer } from '../src/app.js'
import { createTestDatabase } from './pglite.js'

const project = {
  id: '018f47a2-5d1d-7e19-aab8-6f8cc59d9a01',
  dsnProjectId: '42',
  publicKey: 'public-test-key',
}

const envelope = (event: Record<string, unknown>) => {
  const payload = JSON.stringify(event)
  return `${JSON.stringify({ event_id: event.event_id })}\n${JSON.stringify({ type: 'event', length: Buffer.byteLength(payload) })}\n${payload}\n`
}

const fixture = async () => {
  const { database, executor } = await createTestDatabase()
  await executor.query(
    'insert into projects (id, name, slug, dsn_project_id, public_key) values ($1, $2, $3, $4, $5)',
    [project.id, 'Test project', 'test-project', project.dsnProjectId, project.publicKey],
  )
  const app = await buildServer({ database: executor })
  return { app, database }
}

describe('Jabso server', () => {
  it('reports health and database readiness', async () => {
    const { app, database } = await fixture()
    expect((await app.inject({ method: 'GET', url: '/health' })).json()).toEqual({ status: 'ok' })
    expect((await app.inject({ method: 'GET', url: '/ready' })).json()).toEqual({ status: 'ready' })
    await app.close()
    await database.close()
  })

  it('groups three equivalent errors into one issue and keeps all events', async () => {
    const { app, database } = await fixture()
    for (const [index, userId] of ['123456', '987654', '555555'].entries()) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/${project.dsnProjectId}/envelope?sentry_key=${project.publicKey}`,
        headers: { 'content-type': 'application/x-sentry-envelope' },
        payload: envelope({
          event_id: `event-${index}`,
          timestamp: `2026-08-21T00:00:0${index}.000Z`,
          exception: { values: [{
            type: 'TypeError',
            value: `Could not load user ${userId}`,
            stacktrace: { frames: [{ filename: 'src/user.ts', function: 'loadUser', lineno: 12, in_app: true }] },
          }] },
          user: { email: 'must-not-be-stored@example.com' },
        }),
      })
      expect(response.statusCode).toBe(200)
    }

    const issues = await database.query<{ event_count: number }>('select event_count from issues')
    const events = await database.query<{ event_id: string }>('select event_id from events order by event_id')
    const sensitiveColumns = await database.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'events' and column_name in ('raw_payload', 'context')",
    )
    expect(issues.rows).toEqual([{ event_count: 3 }])
    expect(events.rows).toHaveLength(3)
    expect(sensitiveColumns.rows).toEqual([])

    const issueResponse = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}`,
    })
    expect(issueResponse.statusCode).toBe(200)
    const issueList = issueResponse.json<{ items: Array<{ id: string; eventCount: number; exceptionType: string }> }>()
    expect(issueList.items).toHaveLength(1)
    expect(issueList.items[0]).toMatchObject({ eventCount: 3, exceptionType: 'TypeError' })

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues/${issueList.items[0]?.id}?sentry_key=${project.publicKey}`,
    })
    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.json()).toMatchObject({
      eventCount: 3,
      latestEvent: {
        exceptionType: 'TypeError',
        environment: null,
        stacktrace: [{ filename: 'src/user.ts', function: 'loadUser', line: 12, inApp: true }],
      },
    })
    await app.close()
    await database.close()
  })

  it('does not count the same event id twice', async () => {
    const { app, database } = await fixture()
    const request = {
      method: 'POST' as const,
      url: `/api/${project.dsnProjectId}/envelope?sentry_key=${project.publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({ event_id: 'duplicate', message: 'same error' }),
    }
    expect((await app.inject(request)).statusCode).toBe(200)
    expect((await app.inject(request)).statusCode).toBe(200)
    expect((await database.query<{ count: number }>('select event_count as count from issues')).rows[0]?.count).toBe(1)
    expect((await database.query<{ count: number }>('select count(*)::int as count from events')).rows[0]?.count).toBe(1)
    await app.close()
    await database.close()
  })

  it('rejects an invalid project key', async () => {
    const { app, database } = await fixture()
    const response = await app.inject({
      method: 'POST',
      url: `/api/${project.dsnProjectId}/envelope?sentry_key=wrong`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({ event_id: 'event-1', message: 'boom' }),
    })
    await app.close()
    await database.close()
    expect(response.statusCode).toBe(403)
  })

  it('isolates issue reads by project and returns 404 for missing issues', async () => {
    const { app, database } = await fixture()
    await database.query(
      `insert into projects (id, name, slug, dsn_project_id, public_key)
       values ('018f47a2-5d1d-7e19-aab8-6f8cc59d9a02', 'Other project', 'other-project', '84', 'other-key')`,
    )

    const isolatedResponse = await app.inject({
      method: 'GET',
      url: '/api/84/issues?sentry_key=other-key',
    })
    expect(isolatedResponse.statusCode).toBe(200)
    expect(isolatedResponse.json()).toEqual({ items: [], nextCursor: null })

    const missingResponse = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues/018f47a2-5d1d-7e19-aab8-6f8cc59d9aff?sentry_key=${project.publicKey}`,
    })
    expect(missingResponse.statusCode).toBe(404)
    await app.close()
    await database.close()
  })
})
