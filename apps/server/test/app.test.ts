import { describe, expect, it } from 'vitest'
import { buildServer } from '../src/jabso-app.js'
import { createTestDatabase } from './pglite.js'

const project = {
  id: '018f47a2-5d1d-7e19-aab8-6f8cc59d9a01',
  dsnProjectId: '42',
  publicKey: 'public-test-key',
}
const adminToken = 'phase-three-admin-token'
const dashboardToken = 'phase-three-dashboard-token'
const sourceMap = JSON.stringify({
  version: 3,
  file: 'app.min.js',
  sources: ['src/app.ts'],
  sourcesContent: ['export const explode = () => { throw new Error("private source") }'],
  names: ['explode'],
  mappings: 'AAAAA',
})

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
  const app = await buildServer({ adminToken, dashboardToken, database: executor })
  return { app, database }
}

describe('Jabso server', () => {
  it('serves OpenAPI documentation', async () => {
    const { database, executor } = await createTestDatabase()
    const app = await buildServer({ database: executor })

    const specification = await app.inject({ method: 'GET', url: '/docs/json' })
    const documentation = await app.inject({ method: 'GET', url: '/docs/' })

    expect(specification.statusCode).toBe(200)
    expect(specification.json()).toMatchObject({
      openapi: '3.0.3',
      info: { title: 'Jabso API' },
      paths: {
        '/api/{projectId}/envelope': expect.any(Object),
        '/api/{projectId}/issues': expect.any(Object),
      },
    })
    expect(documentation.statusCode).toBe(200)
    expect(documentation.headers['content-type']).toContain('text/html')

    await app.close()
    await database.close()
  })

  it('reports health and database readiness', async () => {
    const { app, database } = await fixture()
    expect((await app.inject({ method: 'GET', url: '/health' })).json()).toEqual({ status: 'ok' })
    expect((await app.inject({ method: 'GET', url: '/ready' })).json()).toEqual({ status: 'ready' })
    await app.close()
    await database.close()
  })

  it('creates and lists projects with dashboard credentials', async () => {
    const { app, database } = await fixture()
    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Unauthorized project' },
    })
    expect(unauthorized.statusCode).toBe(403)

    const createdResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: `Bearer ${dashboardToken}` },
      payload: { name: 'Checkout web' },
    })
    expect(createdResponse.statusCode).toBe(201)
    const created = createdResponse.json<{
      dsnProjectId: string
      id: string
      name: string
      publicKey: string
      slug: string
    }>()
    expect(created).toMatchObject({ name: 'Checkout web' })
    expect(created.dsnProjectId).toMatch(/^\d+$/)
    expect(created.publicKey).toMatch(/^[a-f0-9]{32}$/)

    const projectsResponse = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(projectsResponse.statusCode).toBe(200)
    const projects = projectsResponse.json<{ items: Array<{ id: string; name: string }>; nextCursor: string | null }>()
    expect(projects.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.id, name: 'Checkout web' }),
      expect.objectContaining({ id: project.id }),
    ]))
    expect(projects.nextCursor).toBeNull()

    const ingestionResponse = await app.inject({
      method: 'POST',
      url: `/api/${created.dsnProjectId}/envelope?sentry_key=${created.publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({ event_id: 'new-project-event', message: 'Connected project' }),
    })
    expect(ingestionResponse.statusCode).toBe(200)

    const unauthorizedDelete = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${created.id}`,
    })
    expect(unauthorizedDelete.statusCode).toBe(403)

    const deletedResponse = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${created.id}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(deletedResponse.statusCode).toBe(200)
    expect(deletedResponse.json()).toEqual({ deleted: true, id: created.id })
    expect((await database.query<{ count: number; deletedAt: string | null }>(
      'select count(*)::int as count, max(deleted_at)::text as "deletedAt" from projects where id = $1',
      [created.id],
    )).rows[0]).toMatchObject({ count: 1, deletedAt: expect.any(String) })

    const rejectedIngestion = await app.inject({
      method: 'POST',
      url: `/api/${created.dsnProjectId}/envelope?sentry_key=${created.publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({ event_id: 'deleted-project-event', message: 'Must not be accepted' }),
    })
    expect(rejectedIngestion.statusCode).toBe(403)

    const missingResponse = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${created.id}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(missingResponse.statusCode).toBe(404)
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
          environment: 'production',
          release: 'web@1.2.3',
          breadcrumbs: [{
            timestamp: `2026-08-21T00:00:0${index}.000Z`,
            category: 'fetch',
            message: `GET /users/${userId}?token=must-not-survive`,
          }],
          contexts: {
            browser: { name: 'Chrome', version: '140' },
            device: { family: 'Desktop', serial: 'must-not-be-stored' },
          },
          tags: { runtime: 'browser', user_email: 'must-not-be-stored@example.com' },
          user: { email: 'must-not-be-stored@example.com' },
        }),
      })
      expect(response.statusCode).toBe(200)
    }

    const issues = await database.query<{ event_count: number }>('select event_count from issues')
    const events = await database.query<{ event_id: string }>('select event_id from events order by event_id')
    const sensitiveColumns = await database.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'events' and column_name in ('raw_payload', 'user', 'request')",
    )
    expect(issues.rows).toEqual([{ event_count: 3 }])
    expect(events.rows).toHaveLength(3)
    expect(sensitiveColumns.rows).toEqual([])

    const jsonTypes = await database.query<{
      breadcrumbs_type: string
      context_type: string
      stacktrace_type: string
      tags_type: string
    }>(`select
      jsonb_typeof(stacktrace) as stacktrace_type,
      jsonb_typeof(tags) as tags_type,
      jsonb_typeof(breadcrumbs) as breadcrumbs_type,
      jsonb_typeof(context) as context_type
      from events order by received_at desc limit 1`)
    expect(jsonTypes.rows[0]).toEqual({
      stacktrace_type: 'array',
      tags_type: 'object',
      breadcrumbs_type: 'array',
      context_type: 'object',
    })

    const issueResponse = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(issueResponse.statusCode).toBe(200)
    const issueList = issueResponse.json<{ items: Array<{ id: string; eventCount: number; exceptionType: string }> }>()
    expect(issueList.items).toHaveLength(1)
    expect(issueList.items[0]).toMatchObject({ eventCount: 3, exceptionType: 'TypeError' })

    await database.query(`update events set
      stacktrace = to_jsonb(stacktrace::text),
      tags = to_jsonb(tags::text),
      breadcrumbs = to_jsonb(breadcrumbs::text),
      context = to_jsonb(context::text)`)

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues/${issueList.items[0]?.id}?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.json()).toMatchObject({
      eventCount: 3,
      latestEvent: {
        exceptionType: 'TypeError',
        environment: 'production',
        stacktrace: [{ filename: 'src/user.ts', function: 'loadUser', line: 12, inApp: true }],
        tags: { runtime: 'browser' },
        context: { 'browser.name': 'Chrome', 'browser.version': '140', 'device.family': 'Desktop' },
      },
    })
    const detail = detailResponse.json<{ latestEvent: { breadcrumbs: Array<{ message: string }> } }>()
    expect(detail.latestEvent.breadcrumbs[0]?.message).toBe('GET /users/555555?token=<redacted>')
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

  it('does not accept a public DSN key for dashboard APIs', async () => {
    const { app, database } = await fixture()
    const response = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}`,
    })

    expect(response.statusCode).toBe(403)
    await app.close()
    await database.close()
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
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(isolatedResponse.statusCode).toBe(200)
    expect(isolatedResponse.json()).toEqual({ items: [], nextCursor: null, previousCursor: null })

    const missingResponse = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues/018f47a2-5d1d-7e19-aab8-6f8cc59d9aff?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(missingResponse.statusCode).toBe(404)
    await app.close()
    await database.close()
  })

  it('filters and paginates issues with stable cursors', async () => {
    const { app, database } = await fixture()
    for (const index of [0, 1, 2]) {
      await app.inject({
        method: 'POST',
        url: `/api/${project.dsnProjectId}/envelope?sentry_key=${project.publicKey}`,
        headers: { 'content-type': 'application/x-sentry-envelope' },
        payload: envelope({
          event_id: `page-${index}`,
          timestamp: `2026-08-21T00:00:0${index}.000Z`,
          message: `Page failure ${index}`,
          level: index === 1 ? 'warning' : 'error',
          environment: index === 2 ? 'staging' : 'production',
          release: `web@1.0.${index}`,
          fingerprint: [`page-${index}`],
        }),
      })
    }

    const first = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}&limit=2`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    const firstPage = first.json<{ items: Array<{ title: string }>; nextCursor: string; previousCursor: null }>()
    expect(firstPage.items.map((item) => item.title)).toEqual(['Page failure 2', 'Page failure 1'])
    expect(firstPage.previousCursor).toBeNull()

    const second = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}&limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    const secondPage = second.json<{ items: Array<{ title: string }>; previousCursor: string }>()
    expect(secondPage.items.map((item) => item.title)).toEqual(['Page failure 0'])
    expect(secondPage.previousCursor).toBeTruthy()

    const filtered = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}&level=warning&environment=production&release=web%401.0.1`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(filtered.json<{ items: Array<{ title: string }> }>().items.map((item) => item.title)).toEqual(['Page failure 1'])
    await app.close()
    await database.close()
  })

  it('updates lifecycle status and reopens resolved issues as regressions', async () => {
    const { app, database } = await fixture()
    const send = (eventId: string) => app.inject({
      method: 'POST',
      url: `/api/${project.dsnProjectId}/envelope?sentry_key=${project.publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({
        event_id: eventId,
        timestamp: eventId === 'before' ? '2026-08-21T00:00:00.000Z' : '2026-08-22T00:00:00.000Z',
        message: 'Lifecycle failure',
        fingerprint: ['lifecycle-failure'],
      }),
    })
    await send('before')
    const list = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    const issueId = list.json<{ items: Array<{ id: string }> }>().items[0]?.id
    const resolved = await app.inject({
      method: 'PATCH',
      url: `/api/${project.dsnProjectId}/issues/${issueId}/status?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
      payload: { status: 'resolved' },
    })
    expect(resolved.json()).toMatchObject({ issueId, status: 'resolved' })

    await send('after')
    const detail = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues/${issueId}?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(detail.json()).toMatchObject({ status: 'unresolved', resolvedAt: null })
    expect(detail.json<{ regressedAt: string; occurrences: unknown[] }>().regressedAt).toBeTruthy()
    expect(detail.json<{ occurrences: unknown[] }>().occurrences).toHaveLength(2)
    await app.close()
    await database.close()
  })

  it('backfills late source maps while preserving original frames and private source content', async () => {
    const { app, database } = await fixture()
    const ingestion = await app.inject({
      method: 'POST',
      url: `/api/${project.dsnProjectId}/envelope?sentry_key=${project.publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({
        event_id: 'late-map-event',
        message: 'Minified failure',
        release: 'web@2.0.0',
        dist: 'browser',
        stacktrace: {
          frames: [{
            filename: 'https://cdn.example.com/assets/app.min.js?build=2',
            function: 'a',
            lineno: 1,
            colno: 0,
            in_app: true,
          }],
        },
      }),
    })
    expect(ingestion.statusCode).toBe(200)
    expect((await database.query<{ status: string }>(
      'select symbolication_status as status from events where event_id = $1',
      ['late-map-event'],
    )).rows[0]?.status).toBe('missing')
    await database.query(
      'update events set stacktrace = to_jsonb(stacktrace::text) where event_id = $1',
      ['late-map-event'],
    )

    const unauthorized = await app.inject({
      method: 'PUT',
      url: `/api/${project.dsnProjectId}/releases/web%402.0.0/artifacts?dist=browser&artifact_path=${encodeURIComponent('/assets/app.min.js.map')}`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: sourceMap,
    })
    expect(unauthorized.statusCode).toBe(403)

    const upload = await app.inject({
      method: 'PUT',
      url: `/api/${project.dsnProjectId}/releases/web%402.0.0/artifacts?dist=browser&artifact_path=${encodeURIComponent('/assets/app.min.js.map')}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/octet-stream',
      },
      payload: sourceMap,
    })
    expect(upload.statusCode).toBe(200)
    expect(upload.json()).toMatchObject({
      artifactPath: '/assets/app.min.js.map',
      processedEventCount: 1,
      completedEventCount: 1,
      pendingEventCount: 0,
    })
    expect((await database.query<{ type: string }>(
      'select jsonb_typeof(symbolicated_stacktrace) as type from events where event_id = $1',
      ['late-map-event'],
    )).rows[0]?.type).toBe('array')

    const issueList = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    const issueId = issueList.json<{ items: Array<{ id: string }> }>().items[0]?.id
    const detail = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues/${issueId}?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(detail.json()).toMatchObject({
      releaseHistory: [{ release: 'web@2.0.0', dist: 'browser', eventCount: 1 }],
      latestEvent: {
        dist: 'browser',
        stacktrace: [{ filename: 'src/app.ts', function: 'explode', line: 1, column: 0 }],
        originalStacktrace: [{
          filename: 'https://cdn.example.com/assets/app.min.js?build=2',
          function: 'a',
          line: 1,
          column: 0,
        }],
        symbolication: { status: 'completed', errorCode: null },
      },
    })
    expect(detail.body).not.toContain('private source')

    const releases = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/releases?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(releases.json()).toMatchObject({
      items: [{ version: 'web@2.0.0', dist: 'browser', artifactCount: 1, eventCount: 1 }],
    })
    await app.close()
    await database.close()
  })

  it('rejects unsafe or malformed source map uploads', async () => {
    const { app, database } = await fixture()
    const headers = {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/octet-stream',
    }
    const unsafePath = await app.inject({
      method: 'PUT',
      url: `/api/${project.dsnProjectId}/releases/web%403.0.0/artifacts?artifact_path=${encodeURIComponent('../private.map')}`,
      headers,
      payload: sourceMap,
    })
    expect(unsafePath.statusCode).toBe(400)
    expect(unsafePath.json()).toMatchObject({ error: 'invalid_path' })

    const malformed = await app.inject({
      method: 'PUT',
      url: `/api/${project.dsnProjectId}/releases/web%403.0.0/artifacts?artifact_path=${encodeURIComponent('/assets/app.min.js.map')}`,
      headers,
      payload: '{"version":3}',
    })
    expect(malformed.statusCode).toBe(400)
    expect(malformed.json()).toMatchObject({ error: 'invalid_source_map' })

    const oversized = await app.inject({
      method: 'PUT',
      url: `/api/${project.dsnProjectId}/releases/web%403.0.0/artifacts?artifact_path=${encodeURIComponent('/assets/oversized.js.map')}`,
      headers,
      payload: Buffer.alloc(5 * 1024 * 1024 + 1, 0x61),
    })
    expect(oversized.statusCode).toBe(413)
    expect((await database.query<{ count: number }>(
      'select count(*)::int as count from source_map_artifacts',
    )).rows[0]?.count).toBe(0)
    await app.close()
    await database.close()
  })

  it('symbolicates new events only with artifacts from the same project and release', async () => {
    const { app, database } = await fixture()
    await database.query(
      `insert into projects (id, name, slug, dsn_project_id, public_key)
       values ('018f47a2-5d1d-7e19-aab8-6f8cc59d9a02', 'Other project', 'other-project', '84', 'other-key')`,
    )
    const upload = await app.inject({
      method: 'PUT',
      url: `/api/${project.dsnProjectId}/releases/web%404.0.0/artifacts?dist=browser&artifact_path=${encodeURIComponent('/assets/app.min.js.map')}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/octet-stream',
      },
      payload: sourceMap,
    })
    expect(upload.statusCode).toBe(200)

    const send = (projectId: string, publicKey: string, eventId: string) => app.inject({
      method: 'POST',
      url: `/api/${projectId}/envelope?sentry_key=${publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({
        event_id: eventId,
        message: 'Project-scoped map',
        release: 'web@4.0.0',
        dist: 'browser',
        stacktrace: { frames: [{ filename: 'https://cdn.example.com/assets/app.min.js', lineno: 1, colno: 0 }] },
      }),
    })
    expect((await send(project.dsnProjectId, project.publicKey, 'mapped-project-event')).statusCode).toBe(200)
    expect((await send('84', 'other-key', 'isolated-project-event')).statusCode).toBe(200)

    const statuses = await database.query<{ event_id: string; status: string }>(
      `select event_id, symbolication_status as status from events
       where event_id in ('mapped-project-event', 'isolated-project-event') order by event_id`,
    )
    expect(statuses.rows).toEqual([
      { event_id: 'isolated-project-event', status: 'missing' },
      { event_id: 'mapped-project-event', status: 'completed' },
    ])
    await app.close()
    await database.close()
  })

  it('tracks release-specific regressions after an issue is resolved', async () => {
    const { app, database } = await fixture()
    const send = (eventId: string, release: string, timestamp: string) => app.inject({
      method: 'POST',
      url: `/api/${project.dsnProjectId}/envelope?sentry_key=${project.publicKey}`,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: envelope({
        event_id: eventId,
        timestamp,
        message: 'Release regression',
        fingerprint: ['release-regression'],
        release,
        dist: 'browser',
      }),
    })
    await send('release-before', 'web@1.0.0', '2026-08-21T00:00:00.000Z')
    const list = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/issues?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    const issueId = list.json<{ items: Array<{ id: string }> }>().items[0]?.id
    await app.inject({
      method: 'PATCH',
      url: `/api/${project.dsnProjectId}/issues/${issueId}/status?sentry_key=${project.publicKey}`,
      headers: { authorization: `Bearer ${dashboardToken}` },
      payload: { status: 'resolved' },
    })
    await send('release-after', 'web@2.0.0', '2026-08-22T00:00:00.000Z')

    const regressions = await app.inject({
      method: 'GET',
      url: `/api/${project.dsnProjectId}/releases/web%402.0.0/regressions?sentry_key=${project.publicKey}&dist=browser`,
      headers: { authorization: `Bearer ${dashboardToken}` },
    })
    expect(regressions.statusCode).toBe(200)
    expect(regressions.json()).toMatchObject({
      items: [{ issueId, title: 'Release regression', dist: 'browser' }],
    })
    const regression = regressions.json<{ items: Array<{ previousResolvedAt: string; regressedAt: string }> }>().items[0]
    expect(regression?.previousResolvedAt).toBeTruthy()
    expect(regression?.regressedAt).toBe('2026-08-22T00:00:00.000Z')
    await app.close()
    await database.close()
  })
})
