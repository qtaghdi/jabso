import {
  createDiagnosticRecorder,
  createNdjsonFileSink,
  type DiagnosticInput,
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

export const createBoundraErrorRecorder = (path = process.env.JABSO_BOUNDRA_DIAGNOSTIC_PATH) => {
  const filePath = resolveBoundraDiagnosticPath(path)
  return createDiagnosticRecorder({
    primary: createNdjsonFileSink(filePath),
    onDropped: (diagnostic, reason) => {
      console.error('[jabso:boundra-diagnostic:dropped]', diagnostic.code, reason)
    },
  })
}
