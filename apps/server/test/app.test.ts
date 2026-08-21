import { describe, expect, it } from 'vitest'
import { buildServer } from '../src/app.js'

const body = '{}\n{"type":"event","length":2}\n{}\n'

describe('Jabso server', () => {
  it('reports health', async () => {
    const app = await buildServer({ projectId: '1', projectKey: 'test' })
    const response = await app.inject({ method: 'GET', url: '/health' })
    await app.close()
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('accepts an authenticated Sentry envelope', async () => {
    const app = await buildServer({ projectId: '1', projectKey: 'test' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/1/envelope?sentry_key=test',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: body,
    })
    await app.close()
    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('id')
  })

  it('rejects an invalid project key', async () => {
    const app = await buildServer({ projectId: '1', projectKey: 'test' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/1/envelope?sentry_key=wrong',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      payload: body,
    })
    await app.close()
    expect(response.statusCode).toBe(403)
  })
})
