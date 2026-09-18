import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { JabsoSignUp } from 'src/screens/auth/jabso-sign-up'
import { getSafeAuthRedirect } from 'src/shared/auth/auth-redirect'
import { getI18n } from 'src/shared/i18n/locale'

type SignUpPageProps = {
  searchParams: Promise<{ redirect?: string }>
}

const SignUpPage = async ({ searchParams }: SignUpPageProps) => {
  const { redirect } = await searchParams
  const { t } = await getI18n()
  const callbackURL = getSafeAuthRedirect(redirect, '/onboarding')

  return (
    <AuthPageShell description={t('auth.createAccountDescription')} title={t('auth.createAccountTitle')}>
      <JabsoSignUp callbackURL={callbackURL} />
    </AuthPageShell>
  )
}

export default SignUpPage
