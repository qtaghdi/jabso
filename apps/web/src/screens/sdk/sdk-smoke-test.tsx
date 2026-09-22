'use client'

import { useQueryClient } from '@tanstack/react-query'
import { addBreadcrumb, captureException, flush, init, setContext, setTag } from '@sentry/browser'
import { useEffect, useState } from 'react'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { dashboardQueryKeys } from 'src/shared/query/dashboard-query'
import { Button } from 'src/shared/ui/button'

export const SdkSmokeTest = ({ dsn }: { dsn: string }) => {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    init({
      dist: 'browser',
      dsn,
      enabled: true,
      environment: 'production',
      maxBreadcrumbs: 50,
      release: 'jabso-smoke-test@1.0.0',
      sendDefaultPii: false,
    })
    setMessages([t('sdk.target', { host: new URL(dsn).host })])
  }, [dsn, t])

  const captureTestError = async () => {
    const error = new Error(`Jabso smoke test ${crypto.randomUUID()}`)
    setTag('feature', 'onboarding')
    setContext('runtime', { name: 'browser', version: 'smoke-test' })
    addBreadcrumb({
      category: 'onboarding',
      level: 'info',
      message: 'Jabso SDK connected',
    })
    captureException(error)
    setSending(true)
    setMessages((current) => [t('sdk.sendingMessage', { message: error.message }), ...current])
    const delivered = await flush(3000)
    if (delivered) {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.issueLists,
        refetchType: 'none',
      })
    }
    setMessages((current) => [
      t(delivered ? 'sdk.delivered' : 'sdk.timedOut', { message: error.message }),
      ...current,
    ])
    setSending(false)
  }

  return (
    <section className="smoke-test-panel">
      <p>
        {t('sdk.smokePanelDescription')}
      </p>
      <Button disabled={sending} type="button" onClick={captureTestError}>
        {sending ? t('sdk.sending') : t('sdk.sendTest')}
      </Button>
      <pre aria-live="polite">{messages.join('\n')}</pre>
    </section>
  )
}
