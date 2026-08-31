'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthFormFallback } from 'src/screens/auth/auth-form-fallback'
import { AuthTransition } from 'src/screens/auth/auth-transition'
import { authClient } from 'src/shared/auth/auth-client'
import { GitHubIcon } from 'src/shared/brand/github-icon'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'

export const JabsoSignIn = () => {
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session) router.replace('/')
  }, [router, session])

  const signInWithGitHub = async () => {
    setError(null)
    setIsSubmitting(true)
    const result = await authClient.signIn.social({ provider: 'github', callbackURL: '/' })
    if (result.error) {
      setError(result.error.message ?? 'Could not continue with GitHub')
      setIsSubmitting(false)
    }
  }

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter both your email address and password')
      return
    }
    setIsSubmitting(true)
    const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL: '/' })
    if (result.error) {
      setError(result.error.message ?? 'Email or password is incorrect')
      setIsSubmitting(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  if (isSessionPending) return <AuthFormFallback label="Loading sign in" />
  if (session) return <AuthTransition label="Signing you in…" />

  return (
    <form className="auth-form" noValidate onSubmit={signInWithEmail}>
      <Button className="auth-github-button" disabled={isSubmitting} onClick={signInWithGitHub} type="button"><GitHubIcon /> Continue with GitHub</Button>
      <div className="auth-divider"><span>or</span></div>
      <Input autoComplete="email" error={error ?? undefined} label="Email address" onChange={(event) => { setEmail(event.target.value); setError(null) }} required type="email" value={email} />
      <Input autoComplete="current-password" label="Password" minLength={10} onChange={(event) => { setPassword(event.target.value); setError(null) }} required type="password" value={password} />
      <Button pending={isSubmitting} type="submit">Sign in</Button>
      <p className="auth-alternate">New to Jabso? <Link href="/sign-up">Create an account</Link></p>
    </form>
  )
}
