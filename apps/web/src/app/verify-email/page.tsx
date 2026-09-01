import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { VerifyEmailForm } from 'src/screens/auth/verify-email-form'

const VerifyEmailPage = () => (
  <AuthPageShell description="Verify your email before creating a workspace." title="Verify your email">
    <VerifyEmailForm />
  </AuthPageShell>
)

export default VerifyEmailPage
