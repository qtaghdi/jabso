'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

const SignInFallback = () => (
  <div className="auth-sign-in-fallback" role="status" aria-label="Loading sign in">
    <div className="auth-fallback-button" />
    <div className="auth-fallback-divider" />
    <div className="auth-fallback-label" />
    <div className="auth-fallback-input" />
    <div className="auth-fallback-button auth-fallback-button-secondary" />
    <span className="sr-only">Loading sign in</span>
  </div>
)

export const JabsoSignIn = () => {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const disableNativeValidation = () => {
      root.querySelectorAll('form').forEach((form) => {
        form.noValidate = true
      })
    }

    disableNativeValidation()

    const observer = new MutationObserver(disableNativeValidation)
    observer.observe(root, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="jabso-sign-in">
      <SignIn
        forceRedirectUrl="/"
        fallback={<SignInFallback />}
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
