import { describe, expect, it } from 'vitest'
import { normalizeSentryEvent } from '../src/index.js'

describe('normalizeSentryEvent', () => {
  it('keeps only the canonical, PII-minimal event fields', () => {
    const event = normalizeSentryEvent({
      event_id: 'abc123',
      timestamp: 1_700_000_000,
      level: 'warning',
      release: 'web@1.2.3',
      dist: 'browser',
      exception: { values: [{ type: 'TypeError', value: 'boom', stacktrace: { frames: [{ filename: 'app.ts', lineno: 7, in_app: true }] } }] },
      tags: { browser: 'test', attempt: 3 },
      user: { email: 'private@example.com' },
      request: { cookies: 'secret' },
    })

    expect(event).toMatchObject({
      eventId: 'abc123',
      message: 'boom',
      exceptionType: 'TypeError',
      level: 'warning',
      release: 'web@1.2.3',
      dist: 'browser',
      tags: { browser: 'test', attempt: '3' },
    })
    expect(event).not.toHaveProperty('user')
    expect(event).not.toHaveProperty('request')
  })
})
