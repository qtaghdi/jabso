import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { AuthNoticeToast } from 'src/screens/auth/auth-notice-toast'
import { JabsoSignIn } from 'src/screens/auth/jabso-sign-in'
import { getSafeAuthRedirect } from 'src/shared/auth/auth-redirect'
import { getI18n } from 'src/shared/i18n/locale'

type SignInPageProps = {
  searchParams: Promise<{ reason?: string; redirect?: string }>
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { reason, redirect } = await searchParams
  const { t } = await getI18n()
  const callbackURL = getSafeAuthRedirect(redirect, '/')

  return (
    <>
      {reason === 'session-expired' ? <AuthNoticeToast description={t('auth.sessionExpiredDescription')} title={t('auth.sessionExpired')} /> : null}
      {reason === 'password-reset' ? <AuthNoticeToast description={t('auth.updatedPasswordDescription')} title={t('auth.updatedPassword')} /> : null}
      <AuthPageShell description={t('auth.signInDescription')} title={t('auth.signInTitle')}>
        <JabsoSignIn callbackURL={callbackURL} />
      </AuthPageShell>
    </>
  )
}

export default SignInPage
