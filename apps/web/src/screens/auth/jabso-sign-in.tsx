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
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

type JabsoSignInProps = {
  callbackURL?: string
}

export const JabsoSignIn = ({ callbackURL = '/' }: JabsoSignInProps) => {
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
      setFormError(getAuthErrorMessage(result.error, 'Could not continue with GitHub'))
      setIsSubmitting(false)
    }
  }

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    if (!email.trim() || !password) {
      setFormError('Enter both your email address and password')
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
      setFormError(getAuthErrorMessage(result.error, 'Email or password is incorrect'))
      setIsSubmitting(false)
      return
    }
    router.replace(callbackURL)
    router.refresh()
  }

  if (isSessionPending) return <AuthFormFallback label="Loading sign in" />
  if (session) return <AuthTransition label="Signing you in…" />

  return (
    <form className="auth-form" noValidate onSubmit={signInWithEmail}>
      {formError ? (
        <div className="auth-callout auth-callout-error" role="alert">
          <strong>Could not sign in</strong>
          <p>{formError}</p>
        </div>
      ) : null}
      <Button className="auth-github-button" disabled={isSubmitting} onClick={signInWithGitHub} type="button"><GitHubIcon /> Continue with GitHub</Button>
      <div className="auth-divider"><span>or</span></div>
      <Input autoComplete="email" label="Email address" onChange={(event) => { setEmail(event.target.value); setFormError(null) }} required type="email" value={email} />
      <Input autoComplete="current-password" label="Password" minLength={10} onChange={(event) => { setPassword(event.target.value); setFormError(null) }} required type="password" value={password} />
      <Link className="auth-forgot-link" href="/forgot-password">Forgot password?</Link>
      <Button pending={isSubmitting} type="submit">Sign in</Button>
      <p className="auth-alternate">New to Jabso? <Link href={getAuthRoute('/sign-up', callbackURL)}>Create an account</Link></p>
    </form>
  )
}
