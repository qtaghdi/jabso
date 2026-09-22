'use client'

import { useRouter } from 'next/navigation'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'

const NotAuthorizedPage = () => {
  const { t } = useI18n()
  const router = useRouter()
  const signOut = async () => {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <main className="route-state unauthorized-state">
      <p className="eyebrow">{t('unauthorized.eyebrow')}</p>
      <h1>{t('unauthorized.title')}</h1>
      <p>{t('unauthorized.description')}</p>
      <Button onClick={signOut} type="button">{t('unauthorized.signOut')}</Button>
    </main>
  )
}

export default NotAuthorizedPage
