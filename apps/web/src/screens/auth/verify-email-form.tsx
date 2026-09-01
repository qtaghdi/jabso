'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import {
  clearPendingAuth,
  getAuthErrorMessage,
  readPendingAuthRedirect,
  readPendingEmail,
  rememberPendingEmail,
} from 'src/shared/auth/auth-client-error'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

export const VerifyEmailForm = () => {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [callbackURL, setCallbackURL] = useState('/onboarding')

  useEffect(() => {
    setEmail(readPendingEmail())
    setCallbackURL(readPendingAuthRedirect('/onboarding'))
  }, [])
  useEffect(() => {
    if (!session) return
    clearPendingAuth()
    router.replace(callbackURL)
  }, [callbackURL, router, session])

  const resend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter the email address you used to sign up')
      return
    }

    setIsSubmitting(true)
    const result = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL,
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Could not send another verification email'))
      return
    }

    rememberPendingEmail(email.trim())
    setIsSent(true)
  }

  return (
    <form className="auth-form" noValidate onSubmit={resend}>
      <div className="auth-callout" role="status">
        <strong>Check your inbox</strong>
        <p>Open the verification link to continue to workspace setup. The link expires in one hour.</p>
      </div>
      <Input
        autoComplete="email"
        error={error ?? undefined}
        label="Email address"
        onChange={(event) => { setEmail(event.target.value); setError(null); setIsSent(false) }}
        required
        type="email"
        value={email}
      />
      <Button pending={isSubmitting} variant="secondary" type="submit">
        {isSent ? 'Verification email sent' : 'Resend verification email'}
      </Button>
      <p className="auth-alternate">Already verified? <Link href="/sign-in">Return to sign in</Link></p>
    </form>
  )
}
