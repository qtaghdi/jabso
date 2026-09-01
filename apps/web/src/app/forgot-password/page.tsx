import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { ForgotPasswordForm } from 'src/screens/auth/forgot-password-form'

const ForgotPasswordPage = () => (
  <AuthPageShell description="We will email you a secure link to choose a new password." title="Reset your password">
    <ForgotPasswordForm />
  </AuthPageShell>
)

export default ForgotPasswordPage
