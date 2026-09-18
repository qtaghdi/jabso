import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { ResetPasswordForm } from 'src/screens/auth/reset-password-form'
import { getI18n } from 'src/shared/i18n/locale'

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string; token?: string }>
}

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  const { error, token } = await searchParams
  const { t } = await getI18n()

  return (
    <AuthPageShell description={t('auth.setPasswordDescription')} title={t('auth.setPasswordTitle')}>
      <ResetPasswordForm isInvalid={Boolean(error)} token={token} />
    </AuthPageShell>
  )
}

export default ResetPasswordPage
