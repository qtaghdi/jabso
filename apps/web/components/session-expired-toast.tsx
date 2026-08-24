'use client'

import { useEffect, useState } from 'react'

const CloseIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <path d="m3.5 3.5 9 9m0-9-9 9" />
  </svg>
)

export const SessionExpiredToast = () => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsVisible(false), 7000)
    return () => window.clearTimeout(timeout)
  }, [])

  if (!isVisible) return null

  return (
    <aside className="session-toast" role="status" aria-live="polite">
      <span className="session-toast-mark" aria-hidden="true">!</span>
      <div>
        <strong>Session expired</strong>
        <p>Sign in again to continue to Jabso.</p>
      </div>
      <button type="button" onClick={() => setIsVisible(false)} aria-label="Dismiss notification">
        <CloseIcon />
      </button>
    </aside>
  )
}
