import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { AuthNoticeToast } from 'src/screens/auth/auth-notice-toast'
import { JabsoSignIn } from 'src/screens/auth/jabso-sign-in'

type SignInPageProps = {
  searchParams: Promise<{ reason?: string }>
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { reason } = await searchParams

  return (
    <>
      {reason === 'session-expired' ? <AuthNoticeToast description="Sign in again to continue to Jabso." title="Session expired" /> : null}
      {reason === 'password-reset' ? <AuthNoticeToast description="Use your new password to sign in." title="Password updated" /> : null}
      <AuthPageShell description="Continue with GitHub or your email and password." title="Sign in to Jabso">
        <JabsoSignIn />
      </AuthPageShell>
    </>
  )
}

export default SignInPage
