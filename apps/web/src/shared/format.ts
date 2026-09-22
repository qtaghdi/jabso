import type { Locale } from 'src/shared/i18n/messages'

const localeName = (locale: Locale) => locale === 'ko' ? 'ko-KR' : 'en'

export const formatDateTime = (value: string, locale: Locale = 'en') => new Intl.DateTimeFormat(localeName(locale), {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  timeZoneName: 'short',
  year: 'numeric',
}).format(new Date(value))

export const formatCount = (value: number, locale: Locale = 'en') => new Intl.NumberFormat(localeName(locale)).format(value)

export const formatLocation = (frame: { filename?: string; line?: number; column?: number }) => {
  const line = frame.line === undefined ? '' : `:${frame.line}`
  const column = frame.column === undefined ? '' : `:${frame.column}`
  return `${frame.filename ?? '(unknown file)'}${line}${column}`
}
