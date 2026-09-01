import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { ResetPasswordForm } from 'src/screens/auth/reset-password-form'

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string; token?: string }>
}

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  const { error, token } = await searchParams

  return (
    <AuthPageShell description="Choose a new password for your Jabso account." title="Set a new password">
      <ResetPasswordForm isInvalid={Boolean(error)} token={token} />
    </AuthPageShell>
  )
}

export default ResetPasswordPage
