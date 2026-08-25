'use client'

import { captureException, flush, init } from '@sentry/browser'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export const SdkSmokeTest = ({ dsn }: { dsn: string }) => {
  const [messages, setMessages] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    init({ dsn, enabled: true })
    setMessages([`Target: ${new URL(dsn).host}`])
  }, [dsn])

  const captureTestError = async () => {
    const error = new Error(`Jabso smoke test ${crypto.randomUUID()}`)
    captureException(error)
    setSending(true)
    setMessages((current) => [`Sending: ${error.message}`, ...current])
    const delivered = await flush(3000)
    setMessages((current) => [
      delivered ? `Delivered: ${error.message}` : `Timed out: ${error.message}`,
      ...current,
    ])
    setSending(false)
  }

  return (
    <section className="smoke-test-panel">
      <p>
        Send a real browser exception through the installed Sentry SDK, then return to the issue inbox.
      </p>
      <Button disabled={sending} type="button" onClick={captureTestError}>
        {sending ? 'Sending…' : 'Send test error'}
      </Button>
      <pre aria-live="polite">{messages.join('\n')}</pre>
    </section>
  )
}
