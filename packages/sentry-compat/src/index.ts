const decoder = new TextDecoder('utf-8', { fatal: true })

export type SentryEnvelopeHeader = Record<string, unknown>

export type SentryEnvelopeItemHeader = Record<string, unknown> & {
  length?: number
  type?: string
}

export type SentryEnvelopeItem = {
  header: SentryEnvelopeItemHeader
  payload: Uint8Array
}

export type SentryEnvelope = {
  header: SentryEnvelopeHeader
  items: SentryEnvelopeItem[]
}

export type ParseEnvelopeOptions = {
  maxItems?: number
  maxItemBytes?: number
}

export class SentryEnvelopeParseError extends Error {
  constructor(
    readonly code:
      | 'EMPTY_ENVELOPE'
      | 'INVALID_JSON'
      | 'INVALID_HEADER'
      | 'INVALID_ITEM_LENGTH'
      | 'ITEM_TOO_LARGE'
      | 'TOO_MANY_ITEMS'
      | 'TRUNCATED_ITEM',
    message: string,
  ) {
    super(message)
    this.name = 'SentryEnvelopeParseError'
  }
}

function parseObject(bytes: Uint8Array, label: string): Record<string, unknown> {
  let value: unknown
  try {
    value = JSON.parse(decoder.decode(bytes))
  } catch {
    throw new SentryEnvelopeParseError('INVALID_JSON', `${label} is not valid UTF-8 JSON`)
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SentryEnvelopeParseError('INVALID_HEADER', `${label} must be a JSON object`)
  }
  return value as Record<string, unknown>
}

export function parseSentryEnvelope(
  input: Uint8Array,
  options: ParseEnvelopeOptions = {},
): SentryEnvelope {
  const maxItems = options.maxItems ?? 100
  const maxItemBytes = options.maxItemBytes ?? 5 * 1024 * 1024
  let offset = 0

  const nextLine = () => {
    const newline = input.indexOf(0x0a, offset)
    const end = newline === -1 ? input.length : newline
    const line = input.subarray(offset, end)
    offset = newline === -1 ? input.length : end + 1
    return line
  }

  if (input.length === 0) {
    throw new SentryEnvelopeParseError('EMPTY_ENVELOPE', 'Envelope body is empty')
  }

  const header = parseObject(nextLine(), 'Envelope header')
  const items: SentryEnvelopeItem[] = []

  while (offset < input.length) {
    const headerLine = nextLine()
    if (headerLine.length === 0) continue
    if (items.length >= maxItems) {
      throw new SentryEnvelopeParseError('TOO_MANY_ITEMS', `Envelope exceeds ${maxItems} items`)
    }

    const itemHeader = parseObject(headerLine, 'Item header') as SentryEnvelopeItemHeader
    const declaredLength = itemHeader.length
    let payload: Uint8Array

    if (declaredLength !== undefined) {
      if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
        throw new SentryEnvelopeParseError('INVALID_ITEM_LENGTH', 'Item length must be a non-negative integer')
      }
      if (declaredLength > maxItemBytes) {
        throw new SentryEnvelopeParseError('ITEM_TOO_LARGE', `Item exceeds ${maxItemBytes} bytes`)
      }
      if (offset + declaredLength > input.length) {
        throw new SentryEnvelopeParseError('TRUNCATED_ITEM', 'Item payload is shorter than its declared length')
      }
      payload = input.subarray(offset, offset + declaredLength)
      offset += declaredLength
      if (input[offset] === 0x0a) offset += 1
    } else {
      payload = nextLine()
      if (payload.length > maxItemBytes) {
        throw new SentryEnvelopeParseError('ITEM_TOO_LARGE', `Item exceeds ${maxItemBytes} bytes`)
      }
    }

    items.push({ header: itemHeader, payload })
  }

  return { header, items }
}

export function decodeJsonItem<T = unknown>(item: SentryEnvelopeItem): T {
  try {
    return JSON.parse(decoder.decode(item.payload)) as T
  } catch {
    throw new SentryEnvelopeParseError('INVALID_JSON', 'Item payload is not valid UTF-8 JSON')
  }
}
