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
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

type JabsoSignUpProps = {
  callbackURL?: string
}

export const JabsoSignUp = ({ callbackURL = '/onboarding' }: JabsoSignUpProps) => {
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
      setError(getAuthErrorMessage(result.error, 'Could not continue with GitHub'))
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
      setError('Enter your name and email address')
      return
    }
    if (password.length < 10) {
      setError('Use a password with at least 10 characters')
      return
    }
    setIsSubmitting(true)
    const result = await authClient.signUp.email({ email: email.trim(), name: name.trim(), password, callbackURL })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Could not create your account'))
      setIsSubmitting(false)
      return
    }
    rememberPendingEmail(email.trim())
    rememberPendingAuthRedirect(callbackURL)
    router.replace('/verify-email')
  }

  if (isSessionPending) return <AuthFormFallback label="Loading sign up" />
  if (session) return <AuthTransition label="Account created" />

  return (
    <form className="auth-form" noValidate onSubmit={signUp}>
      <Button className="auth-github-button" disabled={isSubmitting} onClick={signUpWithGitHub} type="button"><GitHubIcon /> Continue with GitHub</Button>
      <div className="auth-divider"><span>or</span></div>
      <Input autoComplete="name" label="Name" maxLength={80} onChange={(event) => { setName(event.target.value); setError(null) }} required value={name} />
      <Input autoComplete="email" error={error ?? undefined} label="Email address" onChange={(event) => { setEmail(event.target.value); setError(null) }} required type="email" value={email} />
      <Input autoComplete="new-password" hint="Use at least 10 characters." label="Password" minLength={10} onChange={(event) => { setPassword(event.target.value); setError(null) }} required type="password" value={password} />
      <Button pending={isSubmitting} type="submit">Create account</Button>
      <p className="auth-alternate">Already have an account? <Link href={getAuthRoute('/sign-in', callbackURL)}>Sign in</Link></p>
    </form>
  )
}
