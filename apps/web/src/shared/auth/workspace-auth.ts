import { getSessionCookie } from 'better-auth/cookies'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { findWorkspace } from 'src/shared/api/workspaces'
import { auth } from 'src/shared/auth/auth'

export const requireWorkspace = cache(async () => {
  const startedAt = performance.now()
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) redirect(getSessionCookie(requestHeaders) ? '/sign-in?reason=session-expired' : '/sign-in')
  const userId = session.user.id
  const orgId = session.session.activeOrganizationId ?? null
  const roleResult = orgId
    ? await auth.api.getActiveMemberRole({ headers: requestHeaders })
    : null
  const orgRole = roleResult?.role ?? null
  const externalId = orgId ? `org:${orgId}` : `user:${userId}`
  const workspace = await findWorkspace(externalId)
  if (!workspace) redirect('/onboarding')

  console.info('[jabso-dashboard-auth]', {
    durationMs: Math.round(performance.now() - startedAt),
    mode: orgId ? 'organization' : 'personal',
  })
  return {
    ...workspace,
    canManage: !orgId || orgRole === 'owner' || orgRole === 'admin',
    orgId,
    orgRole,
    userId,
  }
})
