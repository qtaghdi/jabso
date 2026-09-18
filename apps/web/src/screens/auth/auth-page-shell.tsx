import Link from 'next/link'
import type { ReactNode } from 'react'
import { JabsoWordmark } from 'src/shared/brand/jabso-wordmark'
import { AuthSignalField } from 'src/screens/auth/auth-signal-field'
import { getI18n } from 'src/shared/i18n/locale'
import { LanguageSwitcher } from 'src/shared/i18n/language-switcher'

type AuthPageShellProps = {
  children: ReactNode
  description: string
  title: string
}

export const AuthPageShell = async ({ children, description, title }: AuthPageShellProps) => {
  const { t } = await getI18n()
  return <main className="auth-page">
    <section className="auth-intro">
      <Link className="wordmark auth-wordmark" href="/" aria-label="Jabso"><JabsoWordmark /></Link>
      <div className="auth-signal-field"><AuthSignalField /></div>
      <p className="auth-signal-caption">{t('auth.signalCaption')}</p>
    </section>
    <section className="auth-card-wrap">
      <div className="auth-language-switcher"><LanguageSwitcher /></div>
      <div className="auth-form-shell">
        <header className="auth-form-header">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </section>
  </main>
}
