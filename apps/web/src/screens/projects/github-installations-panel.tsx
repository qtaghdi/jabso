'use client'

import { useQuery } from '@tanstack/react-query'
import { Button, buttonClassName } from 'src/shared/ui/button'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import type { MessageKey } from 'src/shared/i18n/messages'
import { githubInstallationsQueryOptions } from 'src/shared/query/dashboard-query'
import type { GitHubInstallationsResponse } from 'src/shared/query/dashboard-types'
import { useGitHubInstallation } from 'src/screens/projects/use-github-installation'

type GitHubInstallationsPanelProps = {
  canManage: boolean
  connectionResult?: string
  initialData: GitHubInstallationsResponse
}

const connectionMessages: Record<string, { error?: boolean; key: MessageKey }> = {
  'already-connected': { error: true, key: 'github.alreadyConnected' },
  connected: { key: 'github.connected' },
  expired: { error: true, key: 'github.expired' },
  'invalid-callback': { error: true, key: 'github.invalidCallback' },
  'not-authorized': { error: true, key: 'github.notAuthorized' },
  'not-configured': { error: true, key: 'github.notConfigured' },
  requested: { key: 'github.requestedTracked' },
  'requested-manual': { key: 'github.requestedManual' },
  unavailable: { error: true, key: 'github.unavailable' },
}

export const GitHubInstallationsPanel = ({
  canManage,
  connectionResult,
  initialData,
}: GitHubInstallationsPanelProps) => {
  const { t } = useI18n()
  const installationsQuery = useQuery({ ...githubInstallationsQueryOptions(), initialData })
  const installMutation = useGitHubInstallation()
  const installations = installationsQuery.data?.items ?? []
  const connectionMessage = connectionResult ? connectionMessages[connectionResult] : undefined
  const waitingForApproval = connectionResult === 'requested' || connectionResult === 'requested-manual'

  return (
    <section className="github-installations-section" aria-labelledby="github-installations-title">
      {connectionMessage ? <p
        className={connectionMessage.error ? 'github-connection-notice github-connection-notice-error' : 'github-connection-notice'}
        role={connectionMessage.error ? 'alert' : 'status'}
      >{t(connectionMessage.key)}</p> : null}
      <div className="github-installations-heading">
        <div>
          <h2 id="github-installations-title">{t('github.app')}</h2>
          <p>{t('github.explanation')}</p>
        </div>
        {canManage && installationsQuery.data?.configured ? <Button
          onClick={() => installMutation.mutate()}
          pending={installMutation.isPending}
          type="button"
          variant={installations.length > 0 ? 'secondary' : 'primary'}
        >
          {waitingForApproval ? t('github.checkApproval') : installations.length > 0 ? t('github.installAnother') : t('github.install')}
        </Button> : null}
      </div>
      <ol className="github-access-steps">
        <li>
          <span>1</span>
          <div><strong>{t('github.accountConnected')}</strong><p>{t('github.accountConnectedDescription')}</p></div>
        </li>
        <li>
          <span>2</span>
          <div><strong>{t('github.appConnected')}</strong><p>{t('github.appConnectedDescription')}</p></div>
        </li>
      </ol>
      {!installationsQuery.data?.configured ? (
        <p className="form-error" role="alert">{t('github.notConfigured')}</p>
      ) : installations.length === 0 ? (
        <p className="github-installations-empty">
          {canManage ? t('github.emptyAdmin') : t('github.emptyMember')}
        </p>
      ) : (
        <div className="github-installation-list">
          {installations.map((installation) => (
            <article className="github-installation-row" key={installation.installationId}>
              <div>
                <strong>{installation.accountLogin}</strong>
                <span>{installation.accountType}</span>
              </div>
              <span className={installation.suspendedAt ? 'github-installation-status suspended' : 'github-installation-status'}>
                {installation.suspendedAt
                  ? t('common.suspended')
                  : installation.repositorySelection === 'all' ? t('github.allRepositories') : t('github.selectedRepositories')}
              </span>
              <a className={buttonClassName('secondary')} href={installation.manageUrl} rel="noreferrer" target="_blank">
                {t('github.manage')}
              </a>
            </article>
          ))}
        </div>
      )}
      {installMutation.error ? <p className="form-error" role="alert">{installMutation.error.message}</p> : null}
    </section>
  )
}
