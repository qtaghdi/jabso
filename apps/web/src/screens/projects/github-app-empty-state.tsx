'use client'

import { Button } from 'src/shared/ui/button'
import { useGitHubInstallation } from 'src/screens/projects/use-github-installation'

export const GitHubAppEmptyState = () => {
  const installMutation = useGitHubInstallation()
  return (
    <div className="github-app-empty-state">
      <div>
        <strong>Install Jabso on GitHub</strong>
        <p>Choose an organization and grant access only to the repositories you want to connect.</p>
      </div>
      <Button
        onClick={() => installMutation.mutate()}
        pending={installMutation.isPending}
        type="button"
      >
        Install GitHub App
      </Button>
      {installMutation.error ? <p className="form-error" role="alert">{installMutation.error.message}</p> : null}
    </div>
  )
}
