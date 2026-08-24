import Link from 'next/link'
import { CopyCodeButton } from '@/components/copy-code-button'
import { buttonClassName } from '@/components/ui/button'

type GettingStartedProps = {
  docsUrl: string
  dsn: string
}

export const GettingStarted = ({ docsUrl, dsn }: GettingStartedProps) => {
  const setupCode = `import * as Sentry from '@sentry/browser'\n\nSentry.init({\n  dsn: '${dsn}',\n})`

  return (
    <section className="getting-started" aria-labelledby="getting-started-title">
      <div className="getting-started-heading">
        <p className="eyebrow">Get started</p>
        <h2 id="getting-started-title">Send your first error to Jabso</h2>
        <p>Connect one toy project, trigger an error, and it will appear here as an issue.</p>
      </div>
      <ol className="setup-steps">
        <li><span>1</span><div><strong>Install the browser SDK</strong><code>pnpm add @sentry/browser</code></div></li>
        <li className="setup-code-step">
          <span>2</span>
          <div>
            <strong>Initialize it with your Jabso DSN</strong>
            <div className="code-panel"><pre><code>{setupCode}</code></pre><CopyCodeButton value={setupCode} /></div>
          </div>
        </li>
        <li><span>3</span><div><strong>Verify the full pipeline</strong><p>Use the built-in smoke test, then return to this inbox.</p></div></li>
      </ol>
      <div className="getting-started-actions">
        <Link className={buttonClassName('primary')} href="/smoke-test">Open SDK smoke test</Link>
        <a className={buttonClassName('secondary')} href={docsUrl} target="_blank" rel="noreferrer">View API docs</a>
      </div>
    </section>
  )
}
