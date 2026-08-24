'use client'

import { useSession, useSessionList } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export const SessionExpiryWatcher = () => {
  const router = useRouter()
  const activeSessionId = useRef<string | null>(null)
  const { isLoaded, isSignedIn, session } = useSession()
  const { isLoaded: isSessionListLoaded, sessions } = useSessionList()
  const sessionId = session?.id

  useEffect(() => {
    if (!isLoaded || !isSessionListLoaded) return

    if (isSignedIn && sessionId) {
      activeSessionId.current = sessionId
      return
    }

    if (isSignedIn !== false || !activeSessionId.current) return

    const hasExpiredSession = sessions.some(({ id, status }) =>
      id === activeSessionId.current && status === 'expired',
    )

    if (hasExpiredSession) router.replace('/sign-in?reason=session-expired')
  }, [isLoaded, isSessionListLoaded, isSignedIn, router, sessionId, sessions])

  return null
}
