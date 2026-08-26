import { AuthPageShell } from 'src/features/auth/components/auth-page-shell'
import { JabsoSignUp } from 'src/features/auth/components/jabso-sign-up'

const SignUpPage = () => (
  <AuthPageShell description="Create your account first. Workspace setup comes next." title="Create your Jabso account">
    <JabsoSignUp />
  </AuthPageShell>
)

export default SignUpPage
