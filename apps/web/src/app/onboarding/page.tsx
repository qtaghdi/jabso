import { redirect } from 'next/navigation'
import { OnboardingFlow } from 'src/screens/onboarding/onboarding-flow'
import { getSafeAuthRedirect } from 'src/shared/auth/auth-redirect'
import { getWorkspaceContext } from 'src/shared/auth/workspace-auth'

const OnboardingPage = async ({ searchParams }: PageProps<'/onboarding'>) => {
  const context = await getWorkspaceContext()
  const requestedRedirect = (await searchParams).redirect
  const redirectTo = getSafeAuthRedirect(
    Array.isArray(requestedRedirect) ? requestedRedirect[0] : requestedRedirect,
    '/',
  )
  if (!context.authenticated) {
    const onboarding = `/onboarding?${new URLSearchParams({ redirect: redirectTo })}`
    const signIn = new URLSearchParams({ redirect: onboarding })
    redirect(context.sessionCookiePresent ? `/sign-in?reason=session-expired&${signIn}` : `/sign-in?${signIn}`)
  }
  if (context.workspace) redirect(redirectTo)
  return <OnboardingFlow hasActiveOrganization={context.hasActiveOrganization} redirectTo={redirectTo} />
}

export default OnboardingPage
