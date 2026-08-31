'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { authClient } from 'src/shared/auth/auth-client'

export const SessionExpiryWatcher = () => {
  const router = useRouter()
  const hadSession = useRef(false)
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (isPending) return
    if (session) {
      hadSession.current = true
      return
    }
    if (hadSession.current) router.replace('/sign-in?reason=session-expired')
  }, [isPending, router, session])

  return null
}
