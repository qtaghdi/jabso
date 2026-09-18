import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { VerifyEmailForm } from 'src/screens/auth/verify-email-form'
import { getI18n } from 'src/shared/i18n/locale'

const VerifyEmailPage = async () => {
  const { t } = await getI18n()
  return <AuthPageShell description={t('auth.verifyDescription')} title={t('auth.verifyEmail')}>
    <VerifyEmailForm />
  </AuthPageShell>
}

export default VerifyEmailPage
