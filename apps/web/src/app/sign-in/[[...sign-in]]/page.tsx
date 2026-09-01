import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { AuthNoticeToast } from 'src/screens/auth/auth-notice-toast'
import { JabsoSignIn } from 'src/screens/auth/jabso-sign-in'
import { getSafeAuthRedirect } from 'src/shared/auth/auth-redirect'

type SignInPageProps = {
  searchParams: Promise<{ reason?: string; redirect?: string }>
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { reason, redirect } = await searchParams
  const callbackURL = getSafeAuthRedirect(redirect, '/')

  return (
    <>
      {reason === 'session-expired' ? <AuthNoticeToast description="Sign in again to continue to Jabso." title="Session expired" /> : null}
      {reason === 'password-reset' ? <AuthNoticeToast description="Use your new password to sign in." title="Password updated" /> : null}
      <AuthPageShell description="Continue with GitHub or your email and password." title="Sign in to Jabso">
        <JabsoSignIn callbackURL={callbackURL} />
      </AuthPageShell>
    </>
  )
}

export default SignInPage
