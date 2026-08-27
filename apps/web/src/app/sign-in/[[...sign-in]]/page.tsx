import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { JabsoSignIn } from 'src/screens/auth/jabso-sign-in'
import { SessionExpiredToast } from 'src/screens/auth/session-expired-toast'

type SignInPageProps = {
  searchParams: Promise<{ reason?: string }>
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { reason } = await searchParams

  return (
    <>
      {reason === 'session-expired' ? <SessionExpiredToast /> : null}
      <AuthPageShell description="Use the GitHub account connected to this instance." title="Sign in to Jabso">
        <JabsoSignIn />
      </AuthPageShell>
    </>
  )
}

export default SignInPage
