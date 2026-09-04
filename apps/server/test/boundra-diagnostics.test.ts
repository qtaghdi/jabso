import { BoundraRuntimeError } from 'boundra'
import { describe, expect, it } from 'vitest'
import {
  createBoundraFallbackSink,
  resolveBoundraDiagnosticPath,
  toBoundraDiagnosticInput,
  toBoundraHttpError,
} from '../src/adapters/http/boundra-diagnostics.js'

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

  it('maps input failures to 400 and internal failures to a safe 500', () => {
    const inputError = new BoundraRuntimeError({
      code: 'RUNTIME-001',
      contract: 'list-projects',
      phase: 'input',
      message: 'contract rejected input',
      suggestion: 'fix the input',
    })
    const handlerError = new BoundraRuntimeError({
      code: 'RUNTIME-003',
      contract: 'list-projects',
      phase: 'handler',
      message: 'handler failed with private database details',
      suggestion: 'inspect the handler',
    })

    expect(toBoundraHttpError(inputError)).toEqual({
      statusCode: 400,
      payload: { error: 'RUNTIME-001', message: 'contract rejected input' },
    })
    expect(toBoundraHttpError(handlerError)).toEqual({
      statusCode: 500,
      payload: { error: 'RUNTIME-003', message: 'internal contract execution failed' },
    })
    expect(JSON.stringify(toBoundraHttpError(handlerError))).not.toContain('private database details')
  })

  it('uses a writable Vercel path when the configured path is blank', () => {
    expect(resolveBoundraDiagnosticPath('', '1', '/var/task')).toBe('/tmp/jabso-boundra.ndjson')
    expect(resolveBoundraDiagnosticPath(' custom.ndjson ', undefined, '/workspace')).toBe('custom.ndjson')
    expect(resolveBoundraDiagnosticPath(undefined, undefined, '/workspace'))
      .toBe('/workspace/.jabso-diagnostics/boundra.ndjson')
  })

  it('uses a safe structured runtime log as the Vercel fallback', async () => {
    const lines: string[] = []
    const sink = createBoundraFallbackSink({
      vercel: '1',
      log: (line) => lines.push(line),
    })

    await sink({
      id: 'c721d311-ad3f-4d58-984c-ce7f6cf1ccb2',
      kind: 'runtime_contract',
      code: 'RUNTIME-001',
      message: 'contract rejected input',
      contract: 'ingest-event',
      issues: [{ path: ['eventId'], message: 'required' }],
      boundraVersion: '0.5.0',
      occurredAt: '2026-09-04T00:00:00.000Z',
      context: { phase: 'input' },
    })

    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0] ?? '{}')).toEqual({
      level: 'error',
      message: 'Boundra diagnostic database persistence failed',
      diagnostic: expect.objectContaining({
        code: 'RUNTIME-001',
        contract: 'ingest-event',
      }),
    })
  })
})
