import {
  createDiagnosticRecorder,
  createNdjsonFileSink,
  type BoundraDiagnostic,
  type DiagnosticInput,
  type DiagnosticSink,
} from '@jabso/diagnostics'
import { BoundraRuntimeError } from 'boundra'
import { resolve } from 'node:path'

const diagnosticFileName = 'jabso-boundra.ndjson'
const internalContractMessage = 'internal contract execution failed'

export const toBoundraDiagnosticInput = (error: BoundraRuntimeError): DiagnosticInput => {
  const safe = error.toJSON()
  return {
    kind: 'runtime_contract',
    code: safe.code,
    message: safe.message,
    contract: safe.contract,
    operation: undefined,
    issues: safe.issues.map((issue) => ({
      path: [...issue.path],
      message: issue.message,
    })),
    boundraVersion: '0.5.0',
    context: {
      phase: safe.phase,
    },
  }
}

export const toBoundraHttpError = (error: BoundraRuntimeError) => error.phase === 'input'
  ? {
      statusCode: 400 as const,
      payload: { error: error.code, message: error.message },
    }
  : {
      statusCode: 500 as const,
      payload: { error: error.code, message: internalContractMessage },
    }

export const resolveBoundraDiagnosticPath = (
  path = process.env.JABSO_BOUNDRA_DIAGNOSTIC_PATH,
  vercel = process.env.VERCEL,
  cwd = process.cwd(),
) => {
  const configuredPath = path?.trim()
  if (configuredPath) return configuredPath
  return vercel === '1'
    ? resolve('/tmp', diagnosticFileName)
    : resolve(cwd, '.jabso-diagnostics', 'boundra.ndjson')
}

type BoundraFallbackLog = (line: string) => void

export const createBoundraFallbackSink = (options: {
  path?: string
  vercel?: string
  cwd?: string
  log?: BoundraFallbackLog
} = {}): DiagnosticSink => {
  if ((options.vercel ?? process.env.VERCEL) === '1') {
    const log = options.log ?? console.error
    return async (diagnostic: BoundraDiagnostic) => {
      log(JSON.stringify({
        level: 'error',
        message: 'Boundra diagnostic database persistence failed',
        diagnostic,
      }))
    }
  }

  return createNdjsonFileSink(resolveBoundraDiagnosticPath(
    options.path,
    options.vercel,
    options.cwd,
  ))
}

export const createBoundraErrorRecorder = (options: {
  primary?: DiagnosticSink
  fallback?: DiagnosticSink
  path?: string
  vercel?: string
  cwd?: string
  log?: BoundraFallbackLog
} = {}) => {
  const fallbackSink = createBoundraFallbackSink(options)
  return createDiagnosticRecorder({
    primary: options.primary ?? fallbackSink,
    fallback: options.primary ? options.fallback ?? fallbackSink : options.fallback,
    onDropped: (diagnostic) => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Boundra diagnostic dropped',
        diagnosticId: diagnostic.id,
        diagnosticCode: diagnostic.code,
      }))
    },
  })
}
