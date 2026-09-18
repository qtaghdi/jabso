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
import { useI18n } from 'src/shared/i18n/i18n-provider'

export const VerifyEmailForm = () => {
  const { t } = useI18n()
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
      setError(t('auth.verificationEmailRequired'))
      return
    }

    setIsSubmitting(true)
    const result = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL,
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('auth.verificationError')))
      return
    }

    rememberPendingEmail(email.trim())
    setIsSent(true)
  }

  return (
    <form className="auth-form" noValidate onSubmit={resend}>
      <div className="auth-callout" role="status">
        <strong>{t('auth.checkInbox')}</strong>
        <p>{t('auth.verificationDescription')}</p>
      </div>
      <Input
        autoComplete="email"
        error={error ?? undefined}
        label={t('auth.email')}
        name="email"
        onChange={(event) => { setEmail(event.target.value); setError(null); setIsSent(false) }}
        required
        spellCheck={false}
        type="email"
        value={email}
      />
      <Button pending={isSubmitting} variant="secondary" type="submit">
        {isSent ? t('auth.verificationSent') : t('auth.verificationResend')}
      </Button>
      <p className="auth-alternate"><Link href="/sign-in">{t('auth.returnSignIn')}</Link></p>
    </form>
  )
}
