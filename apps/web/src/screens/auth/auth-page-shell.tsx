import Link from 'next/link'
import type { ReactNode } from 'react'
import { JabsoWordmark } from 'src/shared/brand/jabso-wordmark'
import { AuthSignalField } from 'src/screens/auth/auth-signal-field'

type AuthPageShellProps = {
  children: ReactNode
  description: string
  title: string
}

export const AuthPageShell = ({ children, description, title }: AuthPageShellProps) => (
  <main className="auth-page">
    <section className="auth-intro">
      <Link className="wordmark auth-wordmark" href="/" aria-label="Jabso home"><JabsoWordmark /></Link>
      <div className="auth-signal-field"><AuthSignalField /></div>
      <p className="auth-signal-caption"><strong>24 events</strong> grouped into <strong>1 issue</strong></p>
    </section>
    <section className="auth-card-wrap">
      <div className="auth-form-shell">
        <header className="auth-form-header">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </section>
  </main>
)
