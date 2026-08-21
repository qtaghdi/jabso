import {
  createDiagnosticRecorder,
  createNdjsonFileSink,
  type DiagnosticInput,
} from '@jabso/diagnostics'
import { BoundraRuntimeError } from 'boundra'
import { resolve } from 'node:path'

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
    boundraVersion: '0.2.2',
    context: {
      phase: safe.phase,
    },
  }
}

export const createBoundraErrorRecorder = (path = process.env.JABSO_BOUNDRA_DIAGNOSTIC_PATH) => {
  const filePath = path ?? resolve(process.cwd(), '.jabso-diagnostics/boundra.ndjson')
  return createDiagnosticRecorder({
    primary: createNdjsonFileSink(filePath),
    onDropped: (diagnostic, reason) => {
      console.error('[jabso:boundra-diagnostic:dropped]', diagnostic.code, reason)
    },
  })
}
