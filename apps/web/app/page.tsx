'use client'

import { captureException, init } from '@sentry/browser'
import { useEffect, useState } from 'react'

const dsn = process.env.NEXT_PUBLIC_JABSO_DSN ?? 'http://spike@localhost:4000/1'

export default function Page() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    init({
      dsn,
      enabled: true,
    })
    setMessages([`Jabso SDK target: ${new URL(dsn).host}`])
  }, [])

  function captureTestError() {
    const error = new Error(`Jabso test error ${Math.floor(performance.now())}`)
    captureException(error)
    setMessages((current) => [`Captured: ${error.message}`, ...current])
  }

  return (
    <main>
      <h1>Jabso</h1>
      <p>앱이 내는 잡소리에서 원인을 찾는 개인용 오류 관측 도구.</p>
      <button type="button" onClick={captureTestError}>
        Capture test error
      </button>
      <pre>{messages.join('\n')}</pre>
    </main>
  )
}
