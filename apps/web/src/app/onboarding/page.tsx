import { getSessionCookie } from 'better-auth/cookies'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from 'src/screens/onboarding/onboarding-flow'
import { findWorkspace } from 'src/shared/api/workspaces'
import { getAuth } from 'src/shared/auth/auth'

const OnboardingPage = async () => {
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session) redirect(getSessionCookie(requestHeaders) ? '/sign-in?reason=session-expired' : '/sign-in')
  const userId = session.user.id
  const orgId = session.session.activeOrganizationId ?? null
  const externalId = orgId ? `org:${orgId}` : `user:${userId}`
  if (await findWorkspace(externalId)) redirect('/')
  return <OnboardingFlow hasActiveOrganization={Boolean(orgId)} />
}

export default OnboardingPage
