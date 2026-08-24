import Link from 'next/link'
import { CopyCodeButton } from '@/components/copy-code-button'
import { buttonClassName } from '@/components/ui/button'

type GettingStartedProps = {
  docsUrl: string
  dsn: string
}

export const GettingStarted = ({ docsUrl, dsn }: GettingStartedProps) => {
  const setupLines = [
    "import * as Sentry from '@sentry/browser'",
    '',
    'Sentry.init({',
    `  dsn: '${dsn}',`,
    "  environment: process.env.NODE_ENV ?? 'development',",
    '})',
  ]
  const setupCode = setupLines.join('\n')

  return (
    <section className="getting-started" aria-labelledby="getting-started-title">
      <h2 id="getting-started-title">No issues yet. Connect a project to start collecting errors.</h2>
      <div className="setup-workspace">
        <ol className="setup-index" aria-label="SDK setup steps">
          <li>
            <span>Install SDK</span>
            <code>pnpm add @sentry/browser</code>
          </li>
          <li className="setup-index-active" aria-current="step">
            <span>Add your DSN</span>
            <small>Initialize once at app startup.</small>
          </li>
          <li>
            <span>Send a test error</span>
            <small>Confirm the collector path.</small>
          </li>
        </ol>
        <div className="setup-focus">
          <div className="code-panel-heading">
            <code>instrumentation.ts</code>
            <CopyCodeButton value={setupCode} />
          </div>
          <div className="code-panel">
            <pre><code>{setupLines.map((line, index) => (
              <span className="code-line" key={`${index}-${line}`}>
                <span aria-hidden="true">{index + 1}</span>
                <span>{line || ' '}</span>
              </span>
            ))}</code></pre>
          </div>
          <div className="getting-started-actions">
            <Link className={buttonClassName('primary')} href="/smoke-test">Run smoke test</Link>
            <a href={docsUrl} target="_blank" rel="noreferrer">API documentation</a>
          </div>
        </div>
      </div>
    </section>
  )
}
