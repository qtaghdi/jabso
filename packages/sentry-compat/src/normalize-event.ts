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
  dist?: string
  occurredAt?: string
  stacktrace: NormalizedStackFrame[]
  tags: Record<string, string>
  breadcrumbs: Array<{
    timestamp?: string
    category: string
    level?: string
    message?: string
  }>
  context: Record<string, string>
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

const sensitiveKey = /(?:auth|authorization|cookie|email|ip|password|secret|session|token|user)/i

const sanitizeContextText = (value: unknown, max: number) => {
  const normalized = text(value, max)
  if (!normalized) return undefined
  return normalized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    .replace(/([?&](?:access_token|auth|key|session|token)=)[^&#\s]+/gi, '$1<redacted>')
}

const safeContext = (event: Record<string, unknown>) => {
  const result: Record<string, string> = {}
  const contexts = asRecord(event.contexts)
  const allowlisted = [
    ['browser', ['name', 'version']],
    ['runtime', ['name', 'version']],
    ['os', ['name', 'version']],
    ['device', ['family']],
  ] as const
  for (const [group, fields] of allowlisted) {
    const context = asRecord(contexts?.[group])
    for (const field of fields) {
      const value = sanitizeContextText(context?.[field], 500)
      if (value) result[`${group}.${field}`] = value
    }
  }
  return result
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
      if (!sensitiveKey.test(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
        tags[key.slice(0, 200)] = sanitizeContextText(String(value), 1_000) ?? ''
      }
    }
  }

  const rawBreadcrumbs = Array.isArray(event.breadcrumbs)
    ? event.breadcrumbs
    : Array.isArray(asRecord(event.breadcrumbs)?.values)
      ? asRecord(event.breadcrumbs)?.values as unknown[]
      : []
  const breadcrumbs = rawBreadcrumbs.slice(-50).flatMap((value) => {
    const breadcrumb = asRecord(value)
    if (!breadcrumb) return []
    const category = sanitizeContextText(breadcrumb.category ?? breadcrumb.type, 64) ?? 'default'
    const message = sanitizeContextText(breadcrumb.message, 500)
    return [{
      category,
      ...(message ? { message } : {}),
      ...(text(breadcrumb.level, 32) ? { level: text(breadcrumb.level, 32) } : {}),
      ...(normalizeTimestamp(breadcrumb.timestamp) ? { timestamp: normalizeTimestamp(breadcrumb.timestamp) } : {}),
    }]
  })

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
    dist: text(event.dist, 128),
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
    breadcrumbs,
    context: safeContext(event),
    ...(fingerprint?.length ? { customFingerprint: fingerprint } : {}),
  }
}
