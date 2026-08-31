'use client'

import { useQuery } from '@tanstack/react-query'
import { Button, buttonClassName } from 'src/shared/ui/button'
import { githubInstallationsQueryOptions } from 'src/shared/query/dashboard-query'
import type { GitHubInstallationsResponse } from 'src/shared/query/dashboard-types'
import { useGitHubInstallation } from 'src/screens/projects/use-github-installation'

type GitHubInstallationsPanelProps = {
  canManage: boolean
  connectionResult?: string
  initialData: GitHubInstallationsResponse
}

const connectionMessages: Record<string, { error?: boolean; message: string }> = {
  'already-connected': { error: true, message: 'This GitHub installation already belongs to another Jabso workspace.' },
  connected: { message: 'GitHub was connected to this workspace.' },
  expired: { error: true, message: 'The GitHub installation session expired. Start the connection again.' },
  'invalid-callback': { error: true, message: 'GitHub returned an incomplete installation response.' },
  'not-authorized': { error: true, message: 'This GitHub account cannot authorize the selected installation.' },
  'not-configured': { error: true, message: 'The Jabso server is missing its GitHub App configuration.' },
  requested: { message: 'GitHub sent the installation request to an organization owner for approval.' },
  unavailable: { error: true, message: 'GitHub could not complete the installation. Try again.' },
}

export const GitHubInstallationsPanel = ({
  canManage,
  connectionResult,
  initialData,
}: GitHubInstallationsPanelProps) => {
  const installationsQuery = useQuery({ ...githubInstallationsQueryOptions(), initialData })
  const installMutation = useGitHubInstallation()
  const installations = installationsQuery.data?.items ?? []
  const connectionMessage = connectionResult ? connectionMessages[connectionResult] : undefined

  return (
    <section className="github-installations-section" aria-labelledby="github-installations-title">
      {connectionMessage ? <p
        className={connectionMessage.error ? 'github-connection-notice github-connection-notice-error' : 'github-connection-notice'}
        role={connectionMessage.error ? 'alert' : 'status'}
      >{connectionMessage.message}</p> : null}
      <div className="github-installations-heading">
        <div>
          <h2 id="github-installations-title">GitHub App</h2>
          <p>Repository access belongs to this Jabso workspace, not an individual login.</p>
        </div>
        {canManage && installationsQuery.data?.configured ? <Button
          onClick={() => installMutation.mutate()}
          pending={installMutation.isPending}
          type="button"
          variant={installations.length > 0 ? 'secondary' : 'primary'}
        >
          {installations.length > 0 ? 'Install another' : 'Install GitHub App'}
        </Button> : null}
      </div>
      {!installationsQuery.data?.configured ? (
        <p className="form-error" role="alert">GitHub App credentials are not available on the Jabso server.</p>
      ) : installations.length === 0 ? (
        <p className="github-installations-empty">
          {canManage ? 'No GitHub account is connected yet.' : 'Ask a workspace administrator to install the GitHub App.'}
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
                {installation.suspendedAt ? 'Suspended' : installation.repositorySelection === 'all' ? 'All repositories' : 'Selected repositories'}
              </span>
              <a className={buttonClassName('secondary')} href={installation.manageUrl} rel="noreferrer" target="_blank">
                Manage on GitHub
              </a>
            </article>
          ))}
        </div>
      )}
      {installMutation.error ? <p className="form-error" role="alert">{installMutation.error.message}</p> : null}
    </section>
  )
}
