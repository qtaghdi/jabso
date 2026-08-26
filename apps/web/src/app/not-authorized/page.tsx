import { SignOutButton } from '@clerk/nextjs'
import { Button } from 'src/components/ui/button'

const NotAuthorizedPage = () => (
  <main className="route-state unauthorized-state">
    <p className="eyebrow">Private instance</p>
    <h1>This GitHub account cannot open Jabso.</h1>
    <p>Sign out and continue with the GitHub account configured as the instance owner.</p>
    <SignOutButton redirectUrl="/sign-in"><Button type="button">Sign out</Button></SignOutButton>
  </main>
)

export default NotAuthorizedPage
