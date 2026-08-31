'use client'

import { useRouter } from 'next/navigation'
import { authClient } from 'src/shared/auth/auth-client'
import { Button } from 'src/shared/ui/button'

const NotAuthorizedPage = () => {
  const router = useRouter()
  const signOut = async () => {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <main className="route-state unauthorized-state">
      <p className="eyebrow">Private workspace</p>
      <h1>This account cannot open the selected workspace.</h1>
      <p>Sign out and continue with an account that has access.</p>
      <Button onClick={signOut} type="button">Sign out</Button>
    </main>
  )
}

export default NotAuthorizedPage
