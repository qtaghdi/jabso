import { SignIn } from '@clerk/nextjs'

const SignInPage = () => (
  <main className="auth-page">
    <section className="auth-intro">
      <a className="wordmark auth-wordmark" href="/">Jabso</a>
      <div>
        <p className="eyebrow">Personal error inbox</p>
        <h1>Catch the failures<br />that matter.</h1>
        <p>Sign in with the GitHub account that owns this Jabso instance.</p>
      </div>
    </section>
    <section className="auth-card-wrap">
      <SignIn
        forceRedirectUrl="/"
        appearance={{
          elements: {
            cardBox: 'clerk-card-box',
            card: 'clerk-card',
            headerTitle: 'clerk-title',
            headerSubtitle: 'clerk-subtitle',
            socialButtonsBlockButton: 'clerk-social-button',
            footer: 'clerk-footer',
          },
        }}
      />
    </section>
  </main>
)

export default SignInPage
