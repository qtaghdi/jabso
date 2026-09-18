'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthFormFallback } from 'src/screens/auth/auth-form-fallback'
import { AuthTransition } from 'src/screens/auth/auth-transition'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage, rememberPendingAuthRedirect, rememberPendingEmail } from 'src/shared/auth/auth-client-error'
import { getAuthRoute } from 'src/shared/auth/auth-redirect'
import { GitHubIcon } from 'src/shared/brand/github-icon'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

type JabsoSignUpProps = {
  callbackURL?: string
}

export const JabsoSignUp = ({ callbackURL = '/onboarding' }: JabsoSignUpProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const signUpWithGitHub = async () => {
    setError(null)
    setIsSubmitting(true)
    const result = await authClient.signIn.social({ provider: 'github', callbackURL })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('auth.githubError')))
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (session) router.replace(callbackURL)
  }, [callbackURL, router, session])

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim()) {
      setError(t('auth.enterNameAndEmail'))
      return
    }
    if (password.length < 10) {
      setError(t('auth.passwordTooShort'))
      return
    }
    setIsSubmitting(true)
    const result = await authClient.signUp.email({ email: email.trim(), name: name.trim(), password, callbackURL })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('auth.signUpError')))
      setIsSubmitting(false)
      return
    }
    rememberPendingEmail(email.trim())
    rememberPendingAuthRedirect(callbackURL)
    router.replace('/verify-email')
  }

  if (isSessionPending) return <AuthFormFallback label={t('auth.loadingSignUp')} />
  if (session) return <AuthTransition label={t('auth.accountCreated')} />

  return (
    <form className="auth-form" noValidate onSubmit={signUp}>
      <Button className="auth-github-button" disabled={isSubmitting} onClick={signUpWithGitHub} type="button"><GitHubIcon /> {t('auth.continueGitHub')}</Button>
      <div className="auth-divider"><span>{t('auth.or')}</span></div>
      <Input autoComplete="name" label={t('auth.name')} maxLength={80} name="name" onChange={(event) => { setName(event.target.value); setError(null) }} required value={name} />
      <Input autoComplete="email" error={error ?? undefined} label={t('auth.email')} name="email" onChange={(event) => { setEmail(event.target.value); setError(null) }} required spellCheck={false} type="email" value={email} />
      <Input autoComplete="new-password" hint={t('auth.minPassword')} label={t('auth.password')} minLength={10} name="password" onChange={(event) => { setPassword(event.target.value); setError(null) }} required type="password" value={password} />
      <Button pending={isSubmitting} type="submit">{t('auth.createAccount')}</Button>
      <p className="auth-alternate">{t('auth.alreadyAccount')} <Link href={getAuthRoute('/sign-in', callbackURL)}>{t('auth.signIn')}</Link></p>
    </form>
  )
}
