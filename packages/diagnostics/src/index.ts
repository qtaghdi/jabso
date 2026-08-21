import { AsyncLocalStorage } from 'node:async_hooks'
import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export type BoundraDiagnosticKind =
  | 'boundary_violation'
  | 'runtime_contract'
  | 'host_adapter'
  | 'cli'
  | 'unexpected'

export type BoundraDiagnostic = {
  id: string
  kind: BoundraDiagnosticKind
  code?: string
  message: string
  contract?: string
  operation?: 'route' | 'query' | 'mutation'
  issues?: Array<{ path: Array<string | number>; message: string }>
  boundraVersion: string
  jabsoVersion?: string
  occurredAt: string
  context?: Record<string, string | number | boolean | null>
}

export type DiagnosticInput = Omit<BoundraDiagnostic, 'id' | 'occurredAt'> & {
  id?: string
  occurredAt?: string
}

export type DiagnosticSink = (diagnostic: BoundraDiagnostic) => Promise<void>

const truncate = (value: string, maxLength: number) => {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`
}

export const createBoundraDiagnostic = (input: DiagnosticInput): BoundraDiagnostic => {
  return {
    ...input,
    id: input.id ?? randomUUID(),
    message: truncate(input.message, 2_000),
    issues: input.issues?.slice(0, 50).map((issue) => ({
      path: issue.path.slice(0, 20),
      message: truncate(issue.message, 500),
    })),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  }
}

export const createNdjsonFileSink = (path: string): DiagnosticSink => {
  return async (diagnostic) => {
    await mkdir(dirname(path), { recursive: true })
    await appendFile(path, `${JSON.stringify(diagnostic)}\n`, { encoding: 'utf8', mode: 0o600 })
  }
}

export const createDiagnosticRecorder = (options: {
  primary: DiagnosticSink
  fallback?: DiagnosticSink
  onDropped?: (diagnostic: BoundraDiagnostic, reason: unknown) => void
}) => {
  const recording = new AsyncLocalStorage<boolean>()

  return async (input: DiagnosticInput) => {
    const diagnostic = createBoundraDiagnostic(input)
    if (recording.getStore()) {
      options.onDropped?.(diagnostic, new Error('recursive diagnostic attempt'))
      return false
    }

    return recording.run(true, async () => {
      try {
        await options.primary(diagnostic)
        return true
      } catch (primaryError) {
        if (options.fallback) {
          try {
            await options.fallback(diagnostic)
            return true
          } catch (fallbackError) {
            options.onDropped?.(diagnostic, fallbackError)
            return false
          }
        }
        options.onDropped?.(diagnostic, primaryError)
        return false
      }
    })
  }
}
