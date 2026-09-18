'use client'

import { Button } from 'src/shared/ui/button'
import { useGitHubInstallation } from 'src/screens/projects/use-github-installation'
import { useI18n } from 'src/shared/i18n/i18n-provider'

export const GitHubAppEmptyState = () => {
  const { t } = useI18n()
  const installMutation = useGitHubInstallation()
  return (
    <div className="github-app-empty-state">
      <div>
        <strong>{t('github.install')}</strong>
        <p>{t('github.appConnectedDescription')}</p>
      </div>
      <Button
        onClick={() => installMutation.mutate()}
        pending={installMutation.isPending}
        type="button"
      >
        {t('github.install')}
      </Button>
      {installMutation.error ? <p className="form-error" role="alert">{installMutation.error.message}</p> : null}
    </div>
  )
}
