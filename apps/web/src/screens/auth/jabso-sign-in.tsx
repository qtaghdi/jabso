'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthFormFallback } from 'src/screens/auth/auth-form-fallback'
import { AuthTransition } from 'src/screens/auth/auth-transition'
import { useDisableClerkNativeValidation } from 'src/screens/auth/use-disable-clerk-native-validation'

export const JabsoSignIn = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const rootRef = useDisableClerkNativeValidation()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/')
  }, [isLoaded, isSignedIn, router])

  if (isLoaded && isSignedIn) return <AuthTransition label="Signing you in…" />

  return (
    <div ref={rootRef} className="jabso-sign-in">
      <SignIn
        forceRedirectUrl="/"
        signUpForceRedirectUrl="/onboarding"
        signUpUrl="/sign-up"
        fallback={<AuthFormFallback label="Loading sign in" />}
        appearance={{
          elements: {
            rootBox: 'clerk-root-box',
            cardBox: 'clerk-card-box',
            card: 'clerk-card',
            main: 'clerk-main',
            header: 'clerk-header',
            socialButtonsBlockButton: 'clerk-social-button',
            socialButtonsBlockButtonText: 'clerk-social-button-text',
            socialButtonsProviderIcon: 'clerk-social-icon',
            lastAuthenticationStrategyBadge: 'clerk-last-used-badge',
            dividerLine: 'clerk-divider-line',
            dividerText: 'clerk-divider-text',
            formFieldInput: 'clerk-input',
            formFieldErrorText: 'clerk-field-error',
            formButtonPrimary: 'clerk-primary-button',
            footer: 'clerk-footer',
          },
        }}
      />
    </div>
  )
}
