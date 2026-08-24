'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CopyCodeButton } from '@/components/copy-code-button'
import { buttonClassName } from '@/components/ui/button'

type GettingStartedProps = {
  dsn: string
}

const setupStepCopy = [
  { title: 'Install SDK', description: 'Add the browser SDK to your app.' },
  { title: 'Add your DSN', description: 'Initialize once at app startup.' },
  { title: 'Send a test error', description: 'Confirm the collector path.' },
]

export const GettingStarted = ({ dsn }: GettingStartedProps) => {
  const [activeStep, setActiveStep] = useState(0)
  const steps = [
    {
      actionLabel: 'Copy install command',
      code: 'pnpm add @sentry/browser',
      file: 'Terminal',
    },
    {
      actionLabel: 'Copy setup',
      code: [
        "import * as Sentry from '@sentry/browser'",
        '',
        'Sentry.init({',
        `  dsn: '${dsn}',`,
        "  environment: process.env.NODE_ENV ?? 'development',",
        '})',
      ].join('\n'),
      file: 'instrumentation.ts',
    },
    {
      actionLabel: 'Run smoke test',
      code: "Sentry.captureException(new Error('Jabso test error'))",
      file: 'your-app.ts',
    },
  ]
  const step = steps[activeStep]
  const codeLines = step.code.split('\n')

  return (
    <section className="getting-started" aria-labelledby="getting-started-title">
      <h2 id="getting-started-title">No issues yet. Connect a project to start collecting errors.</h2>
      <div className="setup-workspace">
        <ol className="setup-index" aria-label="SDK setup steps">
          {setupStepCopy.map((item, index) => (
            <li className={activeStep === index ? 'setup-index-active' : undefined} key={item.title}>
              <button
                className="setup-step-button"
                type="button"
                aria-current={activeStep === index ? 'step' : undefined}
                onClick={() => setActiveStep(index)}
              >
                <span>{item.title}</span>
                <small>{item.description}</small>
              </button>
            </li>
          ))}
        </ol>
        <div className="setup-focus">
          <div className="code-panel-heading">
            <code>{step.file}</code>
            <CopyCodeButton value={step.code} />
          </div>
          <div className="code-panel">
            <pre><code>{codeLines.map((line, index) => (
              <span className="code-line" key={`${index}-${line}`}>
                <span aria-hidden="true">{index + 1}</span>
                <span>{line || ' '}</span>
              </span>
            ))}</code></pre>
          </div>
          <div className="getting-started-actions">
            {activeStep === 2
              ? <Link className={buttonClassName('primary')} href="/smoke-test">{step.actionLabel}</Link>
              : <CopyCodeButton label={step.actionLabel} value={step.code} variant="primary" />}
            <span>Step {activeStep + 1} of {steps.length}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
