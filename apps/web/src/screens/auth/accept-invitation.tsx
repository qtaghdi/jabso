'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthFormFallback } from 'src/screens/auth/auth-form-fallback'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage } from 'src/shared/auth/auth-client-error'
import { getAuthRoute } from 'src/shared/auth/auth-redirect'
import { Button, buttonClassName } from 'src/shared/ui/button'

type AcceptInvitationProps = {
  invitationId: string
}

export const AcceptInvitation = ({ invitationId }: AcceptInvitationProps) => {
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const callbackURL = `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`

  useEffect(() => {
    if (!session || !invitationId) return
    let active = true
    const loadInvitation = async () => {
      const result = await authClient.organization.getInvitation({ query: { id: invitationId } })
      if (!active) return
      if (result.error) {
        setError(getAuthErrorMessage(result.error, 'This invitation is invalid or has expired'))
        return
      }
      setOrganizationName(result.data.organizationName)
    }
    void loadInvitation()
    return () => { active = false }
  }, [invitationId, session])

  const accept = async () => {
    if (!invitationId || isLoading) return
    setError(null)
    setIsLoading(true)
    const result = await authClient.organization.acceptInvitation({ invitationId })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Could not accept this invitation'))
      setIsLoading(false)
      return
    }
    const activeResult = await authClient.organization.setActive({
      organizationId: result.data.member.organizationId,
    })
    if (activeResult.error) {
      setError(getAuthErrorMessage(activeResult.error, 'The invitation was accepted, but the workspace could not be opened'))
      setIsLoading(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  if (isSessionPending) return <AuthFormFallback label="Loading invitation" />

  if (!session) {
    return (
      <div className="auth-form">
        <div className="auth-callout">
          <strong>Sign in to continue</strong>
          <p>Use the invited email address so Jabso can verify that this invitation belongs to you.</p>
        </div>
        <Link className={buttonClassName()} href={getAuthRoute('/sign-in', callbackURL)}>Sign in</Link>
        <Link className={buttonClassName('secondary')} href={getAuthRoute('/sign-up', callbackURL)}>Create an account</Link>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <div className={['auth-callout', error && 'auth-callout-error'].filter(Boolean).join(' ')} role={error ? 'alert' : 'status'}>
        <strong>{error ? 'Invitation unavailable' : organizationName ? `Join ${organizationName}` : 'Workspace invitation'}</strong>
        <p>{error ?? `Accept as ${session.user.email}. You can switch workspaces at any time.`}</p>
      </div>
      <Button disabled={Boolean(error)} onClick={accept} pending={isLoading} type="button">Accept invitation</Button>
      <Link className="auth-forgot-link" href="/">Return to Jabso</Link>
    </div>
  )
}
