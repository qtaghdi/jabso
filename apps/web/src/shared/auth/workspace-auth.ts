import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { findWorkspace } from 'src/shared/api/workspaces'

export const requireWorkspace = cache(async () => {
  const startedAt = performance.now()
  const { orgId, orgRole, userId } = await auth()
  if (!userId) redirect('/sign-in')
  const externalId = orgId ? `org:${orgId}` : `user:${userId}`
  const workspace = await findWorkspace(externalId)
  if (!workspace) redirect('/onboarding')

  console.info('[jabso-dashboard-auth]', {
    durationMs: Math.round(performance.now() - startedAt),
    mode: orgId ? 'organization' : 'personal',
  })
  return {
    ...workspace,
    canManage: !orgId || orgRole === 'org:admin',
    orgId,
    orgRole,
    userId,
  }
})
