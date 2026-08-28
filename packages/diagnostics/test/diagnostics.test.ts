import { describe, expect, it, vi } from 'vitest'
import { createBoundraDiagnostic, createDiagnosticRecorder } from '../src/index.js'

describe('Boundra diagnostics', () => {
  it('bounds messages and issue details', () => {
    const diagnostic = createBoundraDiagnostic({
      kind: 'runtime_contract',
      message: 'x'.repeat(3_000),
      boundraVersion: '0.5.0',
      issues: [{ path: Array.from({ length: 30 }, (_, index) => index), message: 'y'.repeat(800) }],
    })
    expect(diagnostic.message.length).toBeLessThanOrEqual(2_001)
    expect(diagnostic.issues?.[0]?.path).toHaveLength(20)
    expect(diagnostic.issues?.[0]?.message.length).toBeLessThanOrEqual(501)
  })

  it('uses the fallback sink when the primary sink fails', async () => {
    const fallback = vi.fn(async () => undefined)
    const record = createDiagnosticRecorder({
      primary: async () => {
        throw new Error('database unavailable')
      },
      fallback,
    })
    await expect(
      record({ kind: 'host_adapter', message: 'failed', boundraVersion: '0.5.0' }),
    ).resolves.toBe(true)
    expect(fallback).toHaveBeenCalledOnce()
  })

  it('drops recursive attempts without looping', async () => {
    const dropped = vi.fn()
    const holder: { record?: ReturnType<typeof createDiagnosticRecorder> } = {}
    const record = createDiagnosticRecorder({
      primary: async () => {
        await holder.record?.({ kind: 'unexpected', message: 'nested', boundraVersion: '0.5.0' })
      },
      onDropped: dropped,
    })
    holder.record = record
    await record({ kind: 'runtime_contract', message: 'outer', boundraVersion: '0.5.0' })
    expect(dropped).toHaveBeenCalledOnce()
  })
})
