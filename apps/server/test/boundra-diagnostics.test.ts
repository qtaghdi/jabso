import { BoundraRuntimeError } from 'boundra'
import { describe, expect, it } from 'vitest'
import { toBoundraDiagnosticInput } from '../src/boundra-diagnostics.js'

describe('toBoundraDiagnosticInput', () => {
  it('only copies the safe Boundra diagnostic shape', () => {
    const secretInput = { authorization: 'do-not-record' }
    const error = new BoundraRuntimeError({
      code: 'RUNTIME-001',
      contract: 'ingest-event',
      phase: 'input',
      message: 'contract rejected input',
      suggestion: 'fix the input',
      issues: [{ code: 'invalid_type', path: ['eventId'], message: 'required' }],
      cause: secretInput,
    })

    const diagnostic = toBoundraDiagnosticInput(error)
    expect(diagnostic).toMatchObject({
      kind: 'runtime_contract',
      code: 'RUNTIME-001',
      contract: 'ingest-event',
      context: { phase: 'input' },
    })
    expect(JSON.stringify(diagnostic)).not.toContain('do-not-record')
  })
})
