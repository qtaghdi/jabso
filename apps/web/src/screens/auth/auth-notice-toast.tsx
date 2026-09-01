'use client'

import { useEffect, useState } from 'react'

type AuthNoticeToastProps = {
  description: string
  title: string
}

const CloseIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <path d="m3.5 3.5 9 9m0-9-9 9" />
  </svg>
)

export const AuthNoticeToast = ({ description, title }: AuthNoticeToastProps) => {
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
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button type="button" onClick={() => setIsVisible(false)} aria-label="Dismiss notification">
        <CloseIcon />
      </button>
    </aside>
  )
}
