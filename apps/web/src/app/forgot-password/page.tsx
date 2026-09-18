import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { ForgotPasswordForm } from 'src/screens/auth/forgot-password-form'
import { getI18n } from 'src/shared/i18n/locale'

const ForgotPasswordPage = async () => {
  const { t } = await getI18n()
  return <AuthPageShell description={t('auth.passwordResetDescription')} title={t('auth.passwordResetTitle')}>
    <ForgotPasswordForm />
  </AuthPageShell>
}

export default ForgotPasswordPage
