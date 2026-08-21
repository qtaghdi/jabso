export type NormalizedStackFrame = {
  filename?: string
  function?: string
  line?: number
  column?: number
  inApp?: boolean
}

export type NormalizedSentryEvent = {
  eventId: string
  message?: string
  exceptionType?: string
  level: string
  platform?: string
  environment?: string
  release?: string
  occurredAt?: string
  stacktrace: NormalizedStackFrame[]
  tags: Record<string, string>
  customFingerprint?: string[]
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined

const integer = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined

const normalizeTimestamp = (value: unknown) => {
  const date = typeof value === 'number' ? new Date(value * 1_000) : typeof value === 'string' ? new Date(value) : undefined
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

export const normalizeSentryEvent = (payload: unknown, fallbackEventId?: string): NormalizedSentryEvent => {
  const event = asRecord(payload) ?? {}
  const exceptions = asRecord(event.exception)?.values
  const exception = Array.isArray(exceptions) ? asRecord(exceptions.at(-1)) : undefined
  const logentry = asRecord(event.logentry)
  const stacktrace = asRecord(exception?.stacktrace) ?? asRecord(event.stacktrace)
  const frames = Array.isArray(stacktrace?.frames) ? stacktrace.frames.slice(-200) : []

  const exceptionType = text(exception?.type, 500)
  const message =
    text(exception?.value, 4_000) ??
    text(logentry?.formatted, 4_000) ??
    text(logentry?.message, 4_000) ??
    text(event.message, 4_000) ??
    exceptionType ??
    'Unknown error'

  const tags: Record<string, string> = {}
  const rawTags = asRecord(event.tags)
  if (rawTags) {
    for (const [key, value] of Object.entries(rawTags).slice(0, 100)) {
      if (['string', 'number', 'boolean'].includes(typeof value)) {
        tags[key.slice(0, 200)] = String(value).slice(0, 1_000)
      }
    }
  }

  const fingerprint = Array.isArray(event.fingerprint)
    ? event.fingerprint.flatMap((value) => (typeof value === 'string' ? [value.slice(0, 500)] : [])).slice(0, 20)
    : undefined

  return {
    eventId: text(event.event_id, 64) ?? fallbackEventId ?? crypto.randomUUID().replaceAll('-', ''),
    message,
    exceptionType,
    level: text(event.level, 32) ?? 'error',
    platform: text(event.platform, 64),
    environment: text(event.environment, 128),
    release: text(event.release, 250),
    occurredAt: normalizeTimestamp(event.timestamp),
    stacktrace: frames.flatMap((value) => {
      const frame = asRecord(value)
      if (!frame) return []
      return [{
        filename: text(frame.filename ?? frame.abs_path, 2_000),
        function: text(frame.function, 1_000),
        line: integer(frame.lineno),
        column: integer(frame.colno),
        inApp: typeof frame.in_app === 'boolean' ? frame.in_app : undefined,
      }]
    }),
    tags,
    ...(fingerprint?.length ? { customFingerprint: fingerprint } : {}),
  }
}
