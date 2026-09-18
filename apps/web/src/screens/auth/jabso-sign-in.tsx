'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthFormFallback } from 'src/screens/auth/auth-form-fallback'
import { AuthTransition } from 'src/screens/auth/auth-transition'
import { authClient } from 'src/shared/auth/auth-client'
import {
  getAuthErrorMessage,
  isEmailNotVerifiedError,
  rememberPendingAuthRedirect,
  rememberPendingEmail,
} from 'src/shared/auth/auth-client-error'
import { getAuthRoute } from 'src/shared/auth/auth-redirect'
import { GitHubIcon } from 'src/shared/brand/github-icon'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

type JabsoSignInProps = {
  callbackURL?: string
}

export const JabsoSignIn = ({ callbackURL = '/' }: JabsoSignInProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session) router.replace(callbackURL)
  }, [callbackURL, router, session])

  const signInWithGitHub = async () => {
    setFormError(null)
    setIsSubmitting(true)
    const result = await authClient.signIn.social({ provider: 'github', callbackURL })
    if (result.error) {
      setFormError(getAuthErrorMessage(result.error, t('auth.githubError'), t('auth.rateLimited')))
      setIsSubmitting(false)
    }
  }

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    if (!email.trim() || !password) {
      setFormError(t('auth.enterEmailAndPassword'))
      return
    }
    setIsSubmitting(true)
    const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL })
    if (result.error) {
      if (isEmailNotVerifiedError(result.error)) {
        rememberPendingEmail(email.trim())
        rememberPendingAuthRedirect(callbackURL)
        router.push('/verify-email')
        return
      }
      setFormError(getAuthErrorMessage(result.error, t('auth.emailOrPasswordIncorrect'), t('auth.rateLimited')))
      setIsSubmitting(false)
      return
    }
    router.replace(callbackURL)
    router.refresh()
  }

  if (isSessionPending) return <AuthFormFallback label={t('auth.loadingSignIn')} />
  if (session) return <AuthTransition label={t('auth.signingIn')} />

  return (
    <form className="auth-form" noValidate onSubmit={signInWithEmail}>
      {formError ? (
        <div className="auth-callout auth-callout-error" role="alert">
          <strong>{t('auth.signInError')}</strong>
          <p>{formError}</p>
        </div>
      ) : null}
      <Button className="auth-github-button" disabled={isSubmitting} onClick={signInWithGitHub} type="button"><GitHubIcon /> {t('auth.continueGitHub')}</Button>
      <div className="auth-divider"><span>{t('auth.or')}</span></div>
      <Input autoComplete="email" label={t('auth.email')} name="email" onChange={(event) => { setEmail(event.target.value); setFormError(null) }} required spellCheck={false} type="email" value={email} />
      <Input autoComplete="current-password" label={t('auth.password')} name="password" minLength={10} onChange={(event) => { setPassword(event.target.value); setFormError(null) }} required type="password" value={password} />
      <Link className="auth-forgot-link" href="/forgot-password">{t('auth.forgotPassword')}</Link>
      <Button pending={isSubmitting} type="submit">{t('auth.signIn')}</Button>
      <p className="auth-alternate">{t('auth.newToJabso')} <Link href={getAuthRoute('/sign-up', callbackURL)}>{t('auth.createAccount')}</Link></p>
    </form>
  )
}
