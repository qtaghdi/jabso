'use client'

import { useEffect } from 'react'
import type {
  BoundraErrorViewController,
  BoundraRuntimeDiagnostic,
} from 'boundra/ui'

const boundraRuntimeEvent = 'jabso:boundra-runtime-error'

const isBoundraRuntimeDiagnostic = (value: unknown): value is BoundraRuntimeDiagnostic => {
  if (typeof value !== 'object' || value === null) return false
  const diagnostic = value as Partial<BoundraRuntimeDiagnostic>
  return diagnostic.name === 'BoundraRuntimeError'
    && typeof diagnostic.code === 'string'
    && typeof diagnostic.contract === 'string'
    && typeof diagnostic.message === 'string'
    && typeof diagnostic.suggestion === 'string'
    && (diagnostic.phase === 'input'
      || diagnostic.phase === 'handler'
      || diagnostic.phase === 'result'
      || diagnostic.phase === 'transport')
    && Array.isArray(diagnostic.issues)
}

export const reportBoundraRuntimeDiagnostic = (diagnostic: BoundraRuntimeDiagnostic) => {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<BoundraRuntimeDiagnostic>(boundraRuntimeEvent, { detail: diagnostic }))
}

export const BoundraDevErrorView = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return

    let disposed = false
    let controller: BoundraErrorViewController | null = null
    let pendingDiagnostic: BoundraRuntimeDiagnostic | null = null
    let removeUnhandledListeners = () => undefined
    const report = (event: Event) => {
      const diagnostic = (event as CustomEvent<unknown>).detail
      if (!isBoundraRuntimeDiagnostic(diagnostic)) return
      pendingDiagnostic = diagnostic
      controller?.reportRuntime(diagnostic)
    }

    window.addEventListener(boundraRuntimeEvent, report)
    void Promise.all([import('boundra'), import('boundra/ui')]).then(([runtime, ui]) => {
      if (disposed) return
      controller = ui.createBoundraErrorView()
      const reportUnhandled = (value: unknown) => {
        if (!(value instanceof runtime.BoundraRuntimeError)) return
        const diagnostic = value.toJSON()
        pendingDiagnostic = diagnostic
        controller?.reportRuntime(diagnostic)
      }
      const onError = (event: ErrorEvent) => reportUnhandled(event.error)
      const onRejection = (event: PromiseRejectionEvent) => reportUnhandled(event.reason)
      window.addEventListener('error', onError)
      window.addEventListener('unhandledrejection', onRejection)
      removeUnhandledListeners = () => {
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
      }
      if (pendingDiagnostic) controller.reportRuntime(pendingDiagnostic)
    }).catch(() => undefined)

    return () => {
      disposed = true
      window.removeEventListener(boundraRuntimeEvent, report)
      removeUnhandledListeners()
      controller?.dispose()
    }
  }, [])

  return null
}
