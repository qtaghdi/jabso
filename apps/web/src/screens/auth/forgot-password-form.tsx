'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage } from 'src/shared/auth/auth-client-error'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your email address')
      return
    }

    setIsSubmitting(true)
    const result = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: '/reset-password',
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Could not request a password reset'))
      return
    }

    setIsSent(true)
  }

  if (isSent) {
    return (
      <div className="auth-form">
        <div className="auth-callout" role="status">
          <strong>Check your inbox</strong>
          <p>If an account exists for that address, we sent a password reset link.</p>
        </div>
        <Link className="ui-button ui-button-secondary" href="/sign-in">Return to sign in</Link>
      </div>
    )
  }

  return (
    <form className="auth-form" noValidate onSubmit={requestReset}>
      <Input autoComplete="email" error={error ?? undefined} label="Email address" onChange={(event) => { setEmail(event.target.value); setError(null) }} required type="email" value={email} />
      <Button pending={isSubmitting} type="submit">Send reset link</Button>
      <p className="auth-alternate"><Link href="/sign-in">Return to sign in</Link></p>
    </form>
  )
}
