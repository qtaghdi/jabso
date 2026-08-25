import { SignIn } from '@clerk/nextjs'
import { AuthSignalField } from '@/components/auth-signal-field'
import { JabsoWordmark } from '@/components/jabso-wordmark'
import { SessionExpiredToast } from '@/components/session-expired-toast'

type SignInPageProps = {
  searchParams: Promise<{ reason?: string }>
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { reason } = await searchParams

  return (
    <main className="auth-page">
      {reason === 'session-expired' ? <SessionExpiredToast /> : null}
      <section className="auth-intro">
        <a className="wordmark auth-wordmark" href="/" aria-label="Jabso home"><JabsoWordmark /></a>
        <div className="auth-signal-field">
          <AuthSignalField />
        </div>
        <p className="auth-signal-caption"><strong>24 events</strong> grouped into <strong>1 issue</strong></p>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-form-shell">
          <header className="auth-form-header">
            <h2>Sign in to Jabso</h2>
            <p>Use the GitHub account connected to this instance.</p>
          </header>
          <SignIn
            forceRedirectUrl="/"
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
                formButtonPrimary: 'clerk-primary-button',
                footer: 'clerk-footer',
              },
            }}
          />
        </div>
      </section>
    </main>
  )
}

export default SignInPage
