'use client'

import { useI18n } from 'src/shared/i18n/i18n-provider'

export const SmokeTestSkeleton = () => {
  const { t } = useI18n()
  return (
  <div className="dashboard-page-loading smoke-test-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <span className="skeleton-block skeleton-smoke-panel" />
    <span className="skeleton-block skeleton-back" />
    <span className="sr-only">{t('sdk.smokeLoading')}</span>
  </div>
  )
}
