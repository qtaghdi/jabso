import { describe, expect, it } from 'vitest'
import {
  SentryEnvelopeParseError,
  decodeJsonItem,
  parseSentryEnvelope,
} from '../src/index.js'

const encoder = new TextEncoder()

const envelope = (itemHeader: Record<string, unknown>, payload: string) => {
  return encoder.encode(`{"event_id":"event-1"}\n${JSON.stringify(itemHeader)}\n${payload}\n`)
}

describe('parseSentryEnvelope', () => {
  it('parses a length-delimited JSON event', () => {
    const payload = JSON.stringify({ event_id: 'event-1', message: 'boom' })
    const parsed = parseSentryEnvelope(
      envelope({ type: 'event', length: encoder.encode(payload).length }, payload),
    )

    expect(parsed.header.event_id).toBe('event-1')
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]?.header.type).toBe('event')
    expect(decodeJsonItem(parsed.items[0]!)).toEqual({ event_id: 'event-1', message: 'boom' })
  })

  it('preserves newline bytes inside a length-delimited payload', () => {
    const payload = 'first\nsecond'
    const parsed = parseSentryEnvelope(
      envelope({ type: 'attachment', length: encoder.encode(payload).length }, payload),
    )
    expect(new TextDecoder().decode(parsed.items[0]?.payload)).toBe(payload)
  })

  it('rejects a truncated item', () => {
    expect(() => parseSentryEnvelope(envelope({ type: 'event', length: 99 }, '{}'))).toThrowError(
      expect.objectContaining<Partial<SentryEnvelopeParseError>>({ code: 'TRUNCATED_ITEM' }),
    )
  })

  it('enforces item count limits', () => {
    const body = encoder.encode('{}\n{"type":"event"}\n{}\n{"type":"event"}\n{}\n')
    expect(() => parseSentryEnvelope(body, { maxItems: 1 })).toThrowError(
      expect.objectContaining<Partial<SentryEnvelopeParseError>>({ code: 'TOO_MANY_ITEMS' }),
    )
  })
})
