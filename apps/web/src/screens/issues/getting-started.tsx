'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { CopyCodeButton } from 'src/shared/ui/copy-code-button'
import { buttonClassName } from 'src/shared/ui/button'
import { Select } from 'src/shared/ui/select'

type GettingStartedProps = {
  dsn: string
  projectName: string
}

type FrameworkId = 'javascript' | 'nextjs' | 'react' | 'vue'

type SetupStep = {
  actionLabel: string
  code: string
  file: string
  note: string
}

type FrameworkSetup = {
  label: string
  steps: [SetupStep, SetupStep, SetupStep]
}

type SetupCopy = {
  configureAction: string
  configureNote: string
  installAction: string
  installNote: string
  terminal: string
  testAction: string
  testNote: string
}

const frameworkOrder: FrameworkId[] = ['nextjs', 'react', 'vue', 'javascript']

const createFrameworkSetups = (dsn: string, copy: SetupCopy): Record<FrameworkId, FrameworkSetup> => {
  const captureCode = (packageName: string, framework: string) => [
    `import * as Sentry from '${packageName}'`,
    '',
    'export const sendJabsoTestError = () => {',
    "  Sentry.setTag('feature', 'onboarding')",
    `  Sentry.setContext('runtime', { framework: '${framework}' })`,
    '  Sentry.addBreadcrumb({',
    "    category: 'onboarding',",
    "    message: 'Jabso SDK connected',",
    "    level: 'info',",
    '  })',
    "  Sentry.captureException(new Error('Jabso test error'))",
    '}',
  ].join('\n')

  const setup = ({
    afterInit = '',
    environment,
    file,
    framework,
    initPrefix = '',
    packageName,
    release,
    testFile,
  }: {
    afterInit?: string
    environment: string
    file: string
    framework: string
    initPrefix?: string
    packageName: string
    release: string
    testFile: string
  }): FrameworkSetup => ({
    label: framework,
    steps: [
      {
        actionLabel: copy.installAction,
        code: `pnpm add ${packageName}`,
        file: copy.terminal,
        note: copy.installNote,
      },
      {
        actionLabel: copy.configureAction,
        code: [
          `import * as Sentry from '${packageName}'`,
          '',
          `${initPrefix}Sentry.init({`,
          `  ${initPrefix ? 'app,\n  ' : ''}dsn: '${dsn}',`,
          `  environment: ${environment},`,
          `  release: ${release},`,
          "  dist: 'browser',",
          '  maxBreadcrumbs: 50,',
          '  sendDefaultPii: false,',
          '})',
          ...(afterInit ? ['', afterInit] : []),
        ].join('\n'),
        file,
        note: copy.configureNote,
      },
      {
        actionLabel: copy.testAction,
        code: captureCode(packageName, framework),
        file: testFile,
        note: copy.testNote,
      },
    ],
  })

  return {
    nextjs: setup({
      environment: 'process.env.NODE_ENV',
      file: 'instrumentation-client.ts',
      framework: 'Next.js',
      packageName: '@sentry/nextjs',
      release: "process.env.NEXT_PUBLIC_APP_VERSION ?? 'web@dev'",
      testFile: 'src/lib/jabso-test.ts',
    }),
    react: setup({
      environment: 'import.meta.env.MODE',
      file: 'src/main.tsx',
      framework: 'React (Vite)',
      packageName: '@sentry/react',
      release: "import.meta.env.VITE_APP_VERSION ?? 'web@dev'",
      testFile: 'src/lib/jabso-test.ts',
    }),
    vue: setup({
      afterInit: "app.mount('#app')",
      environment: 'import.meta.env.MODE',
      file: 'src/main.ts',
      framework: 'Vue (Vite)',
      initPrefix: "import { createApp } from 'vue'\nimport App from './App.vue'\n\nconst app = createApp(App)\n\n",
      packageName: '@sentry/vue',
      release: "import.meta.env.VITE_APP_VERSION ?? 'web@dev'",
      testFile: 'src/lib/jabso-test.ts',
    }),
    javascript: setup({
      environment: "'production'",
      file: 'src/instrumentation.ts',
      framework: 'Vanilla JavaScript',
      packageName: '@sentry/browser',
      release: "'web@1.0.0'",
      testFile: 'src/jabso-test.js',
    }),
  }
}

export const GettingStarted = ({ dsn, projectName }: GettingStartedProps) => {
  const { t } = useI18n()
  const [activeStep, setActiveStep] = useState(0)
  const [framework, setFramework] = useState<FrameworkId>('nextjs')
  const frameworkSetups = createFrameworkSetups(dsn, {
    configureAction: t('sdk.copyConfiguration'),
    configureNote: t('sdk.configureNote'),
    installAction: t('sdk.copyInstall'),
    installNote: t('sdk.installNote'),
    terminal: t('sdk.terminal'),
    testAction: t('sdk.runSmokeTest'),
    testNote: t('sdk.testNote'),
  })
  const setupStepCopy = [
    { title: t('sdk.installTitle'), description: t('sdk.installDescription') },
    { title: t('sdk.configureTitle'), description: t('sdk.configureDescription') },
    { title: t('sdk.testTitle'), description: t('sdk.testDescription') },
  ]
  const frameworkSetup = frameworkSetups[framework]
  const steps = frameworkSetup.steps
  const step = steps[activeStep]
  const codeLines = step.code.split('\n')

  return (
    <section className="getting-started" aria-labelledby="getting-started-title">
      <div className="getting-started-heading">
        <div>
          <h2 id="getting-started-title">{t('sdk.connectTitle', { name: projectName })}</h2>
          <p>{t('sdk.connectDescription')}</p>
        </div>
        <Link href="/projects">{t('sdk.changeProject')}</Link>
      </div>
      <div className="setup-workspace">
        <ol className="setup-index" aria-label={t('sdk.setupSteps')}>
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
          <div className="setup-code-shell">
            <div className="code-panel-heading">
              <div className="code-panel-meta">
                <div className="framework-control">
                  <span>{t('sdk.framework')}</span>
                  <Select
                    className="framework-select"
                    hideLabel
                    label={t('sdk.framework')}
                    value={framework}
                    onChange={(event) => setFramework(event.target.value as FrameworkId)}
                  >
                    {frameworkOrder.map((frameworkId) => (
                      <option key={frameworkId} value={frameworkId}>{frameworkSetups[frameworkId].label}</option>
                    ))}
                  </Select>
                </div>
                <span className="code-file"><span>{t('sdk.file')}</span><code>{step.file}</code></span>
              </div>
              <CopyCodeButton iconOnly label={t('sdk.copyCode')} value={step.code} />
            </div>
            <div className="code-panel">
              <pre><code>{codeLines.map((line, index) => (
                <span className="code-line" key={`${index}-${line}`}>
                  <span aria-hidden="true">{index + 1}</span>
                  <span>{line || ' '}</span>
                </span>
              ))}</code></pre>
            </div>
          </div>
          <div className="getting-started-actions">
            {activeStep === 2
              ? <Link className={buttonClassName('primary')} href="/smoke-test">{step.actionLabel}</Link>
              : <CopyCodeButton label={step.actionLabel} value={step.code} variant="primary" />}
            <span>{t('sdk.stepCount', { current: activeStep + 1, total: steps.length })}</span>
          </div>
          <p className="setup-note">{step.note}</p>
        </div>
      </div>
    </section>
  )
}
