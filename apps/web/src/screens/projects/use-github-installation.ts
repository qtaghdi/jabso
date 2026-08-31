'use client'

import { useMutation } from '@tanstack/react-query'
import { startDashboardGitHubInstallation } from 'src/shared/query/dashboard-query'

export const useGitHubInstallation = () => useMutation({
  mutationFn: startDashboardGitHubInstallation,
  onSuccess: ({ url }) => window.location.assign(url),
})
