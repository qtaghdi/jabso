import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { JabsoSignUp } from 'src/screens/auth/jabso-sign-up'
import { getSafeAuthRedirect } from 'src/shared/auth/auth-redirect'

type SignUpPageProps = {
  searchParams: Promise<{ redirect?: string }>
}

const SignUpPage = async ({ searchParams }: SignUpPageProps) => {
  const { redirect } = await searchParams
  const callbackURL = getSafeAuthRedirect(redirect, '/onboarding')

  return (
    <AuthPageShell description="Create your account first. Workspace setup comes next." title="Create your Jabso account">
      <JabsoSignUp callbackURL={callbackURL} />
    </AuthPageShell>
  )
}

export default SignUpPage
