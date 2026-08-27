import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { JabsoSignUp } from 'src/screens/auth/jabso-sign-up'

const SignUpPage = () => (
  <AuthPageShell description="Create your account first. Workspace setup comes next." title="Create your Jabso account">
    <JabsoSignUp />
  </AuthPageShell>
)

export default SignUpPage
