import { getSessionCookie } from 'better-auth/cookies'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { findWorkspace } from 'src/shared/api/workspaces'
import { getAuth } from 'src/shared/auth/auth'

export const getWorkspaceContext = cache(async () => {
  const startedAt = performance.now()
  const requestHeaders = await headers()
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) return {
    authenticated: false as const,
    sessionCookiePresent: Boolean(getSessionCookie(requestHeaders)),
    workspace: null,
  }
  const userId = session.user.id
  const orgId = session.session.activeOrganizationId ?? null
  const roleResult = orgId
    ? await auth.api.getActiveMemberRole({ headers: requestHeaders })
    : null
  const orgRole = roleResult?.role ?? null
  const externalId = orgId ? `org:${orgId}` : `user:${userId}`
  const workspace = await findWorkspace(externalId)
  if (workspace) {
    console.info('[jabso-dashboard-auth]', {
      durationMs: Math.round(performance.now() - startedAt),
      mode: orgId ? 'organization' : 'personal',
    })
  }
  return {
    authenticated: true as const,
    hasActiveOrganization: Boolean(orgId),
    sessionCookiePresent: true,
    workspace: workspace ? {
      ...workspace,
      canManage: !orgId || orgRole === 'owner' || orgRole === 'admin',
      orgId,
      orgRole,
      userId,
    } : null,
  }
})

export const requireWorkspace = cache(async () => {
  const context = await getWorkspaceContext()
  if (!context.authenticated) {
    redirect(context.sessionCookiePresent ? '/sign-in?reason=session-expired' : '/sign-in')
  }
  if (!context.workspace) redirect('/onboarding')
  return context.workspace
})
