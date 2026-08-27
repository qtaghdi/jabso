const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const numberFormatter = new Intl.NumberFormat('en')

export const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value))

export const formatCount = (value: number) => numberFormatter.format(value)

export const formatLocation = (frame: { filename?: string; line?: number; column?: number }) => {
  const line = frame.line === undefined ? '' : `:${frame.line}`
  const column = frame.column === undefined ? '' : `:${frame.column}`
  return `${frame.filename ?? '(unknown file)'}${line}${column}`
}
