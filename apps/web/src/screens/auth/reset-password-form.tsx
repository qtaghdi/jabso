'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage } from 'src/shared/auth/auth-client-error'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

type ResetPasswordFormProps = {
  isInvalid: boolean
  token?: string
}

export const ResetPasswordForm = ({ isInvalid, token }: ResetPasswordFormProps) => {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isInvalid || !token) {
    return (
      <div className="auth-form">
        <div className="auth-callout auth-callout-error" role="alert">
          <strong>This reset link is no longer valid</strong>
          <p>Request a new link to reset your password.</p>
        </div>
        <Link className="ui-button ui-button-primary" href="/forgot-password">Request another link</Link>
      </div>
    )
  }

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (password.length < 10) {
      setError('Use a password with at least 10 characters')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    const result = await authClient.resetPassword({ newPassword: password, token })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Could not reset your password'))
      setIsSubmitting(false)
      return
    }

    router.replace('/sign-in?reason=password-reset')
  }

  return (
    <form className="auth-form" noValidate onSubmit={resetPassword}>
      <Input autoComplete="new-password" hint="Use at least 10 characters." label="New password" minLength={10} onChange={(event) => { setPassword(event.target.value); setError(null) }} required type="password" value={password} />
      <Input autoComplete="new-password" error={error ?? undefined} label="Confirm password" minLength={10} onChange={(event) => { setConfirmation(event.target.value); setError(null) }} required type="password" value={confirmation} />
      <Button pending={isSubmitting} type="submit">Set new password</Button>
    </form>
  )
}
