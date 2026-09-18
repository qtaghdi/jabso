'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage } from 'src/shared/auth/auth-client-error'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

export const ForgotPasswordForm = () => {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError(t('auth.enterEmail'))
      return
    }

    setIsSubmitting(true)
    const result = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: '/reset-password',
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('auth.resetRequestError'), t('auth.rateLimited')))
      return
    }

    setIsSent(true)
  }

  if (isSent) {
    return (
      <div className="auth-form">
        <div className="auth-callout" role="status">
          <strong>{t('auth.checkInbox')}</strong>
          <p>{t('auth.resetEmailSent')}</p>
        </div>
        <Link className="ui-button ui-button-secondary" href="/sign-in">{t('auth.returnSignIn')}</Link>
      </div>
    )
  }

  return (
    <form className="auth-form" noValidate onSubmit={requestReset}>
      <Input autoComplete="email" error={error ?? undefined} label={t('auth.email')} name="email" onChange={(event) => { setEmail(event.target.value); setError(null) }} required spellCheck={false} type="email" value={email} />
      <Button pending={isSubmitting} type="submit">{t('auth.sendReset')}</Button>
      <p className="auth-alternate"><Link href="/sign-in">{t('auth.returnSignIn')}</Link></p>
    </form>
  )
}
