import { cookies } from 'next/headers'
import { AuthPageShell } from 'src/screens/auth/auth-page-shell'
import { GitHubConnectFlow } from 'src/screens/github-connect/github-connect-flow'
import { getWorkspaceContext } from 'src/shared/auth/workspace-auth'
import { getI18n } from 'src/shared/i18n/locale'
import { githubInstallationClaimCookie } from 'src/shared/integrations/github-installation-claim'

const statuses = new Set(['invalid', 'requested', 'unavailable'])

const GitHubConnectPage = async ({ searchParams }: PageProps<'/github/connect'>) => {
  const [context, cookieStore, params, { t }] = await Promise.all([
    getWorkspaceContext(),
    cookies(),
    searchParams,
    getI18n(),
  ])
  const requestedStatus = Array.isArray(params.status) ? params.status[0] : params.status
  const status = statuses.has(requestedStatus ?? '')
    ? requestedStatus as 'invalid' | 'requested' | 'unavailable'
    : undefined
  return <AuthPageShell description={t('github.connectPageDescription')} title={t('github.connectPageTitle')}>
    <GitHubConnectFlow
      authenticated={context.authenticated}
      canManage={context.workspace?.canManage ?? false}
      claimReady={cookieStore.has(githubInstallationClaimCookie)}
      status={status}
      workspaceName={context.workspace?.name}
    />
  </AuthPageShell>
}

export default GitHubConnectPage
