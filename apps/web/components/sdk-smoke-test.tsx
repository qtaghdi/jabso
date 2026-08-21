'use client'

import { captureException, init } from '@sentry/browser'
import { useEffect, useState } from 'react'

const dsn = process.env.NEXT_PUBLIC_JABSO_DSN
  ?? 'http://0123456789abcdef0123456789abcdef@localhost:4000/1'

export const SdkSmokeTest = () => {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    init({ dsn, enabled: true })
    setMessages([`Target: ${new URL(dsn).host}`])
  }, [])

  const captureTestError = () => {
    const error = new Error(`Jabso smoke test ${crypto.randomUUID()}`)
    captureException(error)
    setMessages((current) => [`Captured: ${error.message}`, ...current])
  }

  return (
    <section className="smoke-test-panel">
      <p>
        Send a real browser exception through the installed Sentry SDK, then return to the issue inbox.
      </p>
      <button type="button" onClick={captureTestError}>
        Capture test error
      </button>
      <pre aria-live="polite">{messages.join('\n')}</pre>
    </section>
  )
}
