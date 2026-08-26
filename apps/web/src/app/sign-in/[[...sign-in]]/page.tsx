import { AuthSignalField } from 'src/features/auth/components/auth-signal-field'
import { JabsoSignIn } from 'src/features/auth/components/jabso-sign-in'
import { JabsoWordmark } from 'src/components/brand/jabso-wordmark'
import { SessionExpiredToast } from 'src/features/auth/components/session-expired-toast'

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
          <JabsoSignIn />
        </div>
      </section>
    </main>
  )
}

export default SignInPage
