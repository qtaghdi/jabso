'use client'

import { captureException, init } from '@sentry/browser'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export const SdkSmokeTest = ({ dsn }: { dsn: string }) => {
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
      <Button type="button" onClick={captureTestError}>
        Capture test error
      </Button>
      <pre aria-live="polite">{messages.join('\n')}</pre>
    </section>
  )
}
