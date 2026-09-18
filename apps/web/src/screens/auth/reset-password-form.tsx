'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage } from 'src/shared/auth/auth-client-error'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

type ResetPasswordFormProps = {
  isInvalid: boolean
  token?: string
}

export const ResetPasswordForm = ({ isInvalid, token }: ResetPasswordFormProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isInvalid || !token) {
    return (
      <div className="auth-form">
        <div className="auth-callout auth-callout-error" role="alert">
          <strong>{t('auth.resetInvalidTitle')}</strong>
          <p>{t('auth.resetInvalidDescription')}</p>
        </div>
        <Link className="ui-button ui-button-primary" href="/forgot-password">{t('auth.requestAnotherLink')}</Link>
      </div>
    )
  }

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (password.length < 10) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmation) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setIsSubmitting(true)
    const result = await authClient.resetPassword({ newPassword: password, token })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('auth.resetError'), t('auth.rateLimited')))
      setIsSubmitting(false)
      return
    }

    router.replace('/sign-in?reason=password-reset')
  }

  return (
    <form className="auth-form" noValidate onSubmit={resetPassword}>
      <Input autoComplete="new-password" hint={t('auth.minPassword')} label={t('auth.newPassword')} minLength={10} name="new-password" onChange={(event) => { setPassword(event.target.value); setError(null) }} required type="password" value={password} />
      <Input autoComplete="new-password" error={error ?? undefined} label={t('auth.confirmPassword')} minLength={10} name="confirm-password" onChange={(event) => { setConfirmation(event.target.value); setError(null) }} required type="password" value={confirmation} />
      <Button pending={isSubmitting} type="submit">{t('auth.setPasswordSubmit')}</Button>
    </form>
  )
}
