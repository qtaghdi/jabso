import { SignIn } from '@clerk/nextjs'
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
        <a className="wordmark auth-wordmark" href="/">Jabso</a>
        <div>
          <p className="eyebrow">Personal error inbox</p>
          <h1>Catch the failures<br />that matter.</h1>
          <p>One quiet place for the errors your projects cannot ignore.</p>
        </div>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-form-shell">
          <header className="auth-form-header">
            <p className="eyebrow">Private instance</p>
            <h2>Sign in to Jabso</h2>
            <p>Use the GitHub account connected to this instance.</p>
          </header>
          <SignIn
            forceRedirectUrl="/"
            appearance={{
              elements: {
                cardBox: 'clerk-card-box',
                card: 'clerk-card',
                header: 'clerk-header',
                socialButtonsBlockButton: 'clerk-social-button',
                socialButtonsBlockButtonText: 'clerk-social-button-text',
                socialButtonsProviderIcon: 'clerk-social-icon',
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
