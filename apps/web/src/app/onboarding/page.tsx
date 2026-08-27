import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from 'src/screens/onboarding/onboarding-flow'
import { findWorkspace } from 'src/shared/api/workspaces'

const OnboardingPage = async () => {
  const { orgId, userId } = await auth()
  if (!userId) redirect('/sign-in')
  const externalId = orgId ? `org:${orgId}` : `user:${userId}`
  if (await findWorkspace(externalId)) redirect('/')
  return <OnboardingFlow hasActiveOrganization={Boolean(orgId)} />
}

export default OnboardingPage
