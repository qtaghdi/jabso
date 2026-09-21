'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAuthRoute } from 'src/shared/auth/auth-redirect'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { isGitHubInstallationClaim } from 'src/shared/integrations/github-installation-claim'
import { Button, buttonClassName } from 'src/shared/ui/button'

type GitHubConnectFlowProps = {
  authenticated: boolean
  canManage: boolean
  claimReady: boolean
  status?: 'invalid' | 'requested' | 'unavailable'
  workspaceName?: string
}

export const GitHubConnectFlow = ({
  authenticated,
  canManage,
  claimReady,
  status,
  workspaceName,
}: GitHubConnectFlowProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [isCapturing, setIsCapturing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const claim = new URLSearchParams(window.location.hash.slice(1)).get('claim')
    if (!isGitHubInstallationClaim(claim)) return
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setIsCapturing(true)
    void fetch('/api/github/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claim }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(t('github.connectClaimInvalid'))
      router.refresh()
    }).catch((caught) => {
      setError(caught instanceof Error ? caught.message : t('github.connectClaimInvalid'))
    }).finally(() => setIsCapturing(false))
  }, [router, t])

  const connect = async () => {
    setError(null)
    setIsConnecting(true)
    try {
      const response = await fetch('/api/dashboard/github/installations/claim', { method: 'POST' })
      const result = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(result?.error ?? t('github.connectClaimInvalid'))
      window.location.replace('/projects?github=connected')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('github.connectClaimInvalid'))
      setIsConnecting(false)
    }
  }

  if (isCapturing) {
    return <div className="auth-transition" role="status"><span className="auth-transition-spinner" /><strong>{t('github.connectPreparing')}</strong></div>
  }

  if (!claimReady) {
    const message = status === 'requested'
      ? t('github.connectRequested')
      : status === 'unavailable'
        ? t('github.connectUnavailable')
        : error ?? t('github.connectMissing')
    return <div className="auth-form">
      <div className={`auth-callout ${status === 'requested' ? '' : 'auth-callout-error'}`}><strong>{status === 'requested' ? t('github.connectRequestedTitle') : t('github.connectMissingTitle')}</strong><p>{message}</p></div>
      <Link className={buttonClassName()} href="/projects">{t('github.connectFromProjects')}</Link>
    </div>
  }

  if (!authenticated) {
    return <div className="auth-form">
      <div className="auth-callout"><strong>{t('github.connectSignInTitle')}</strong><p>{t('github.connectSignInDescription')}</p></div>
      <Link className={buttonClassName()} href={getAuthRoute('/sign-in', '/github/connect')}>{t('auth.signIn')}</Link>
      <Link className={buttonClassName('secondary')} href={getAuthRoute('/sign-up', '/github/connect')}>{t('auth.createAccount')}</Link>
    </div>
  }

  if (!workspaceName) {
    return <div className="auth-form">
      <div className="auth-callout"><strong>{t('github.connectWorkspaceTitle')}</strong><p>{t('github.connectWorkspaceDescription')}</p></div>
      <Link className={buttonClassName()} href="/onboarding?redirect=%2Fgithub%2Fconnect">{t('github.connectCreateWorkspace')}</Link>
    </div>
  }

  if (!canManage) {
    return <div className="auth-form">
      <div className="auth-callout"><strong>{t('github.connectAdminTitle')}</strong><p>{t('github.connectAdminDescription', { name: workspaceName })}</p></div>
      <Link className={buttonClassName('secondary')} href="/projects">{t('github.connectSwitchWorkspace')}</Link>
    </div>
  }

  return <div className="auth-form">
    <div className="auth-callout"><strong>{t('github.connectConfirmTitle')}</strong><p>{t('github.connectConfirmDescription', { name: workspaceName })}</p></div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <Button onClick={connect} pending={isConnecting} type="button">{t('github.connectConfirm')}</Button>
    <Link className="auth-forgot-link" href="/projects">{t('common.cancel')}</Link>
  </div>
}
