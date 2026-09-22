'use client'

import { useI18n } from 'src/shared/i18n/i18n-provider'

export const IssueDetailSkeleton = () => {
  const { t } = useI18n()
  return (
  <div className="dashboard-page-loading issue-detail-page-loading" role="status">
    <span className="skeleton-block skeleton-back" />
    <span className="skeleton-block skeleton-detail-title" />
    <div className="skeleton-facts" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}
    </div>
    {Array.from({ length: 2 }, (_, index) => (
      <div className="skeleton-detail-section" key={index} aria-hidden="true">
        <span className="skeleton-block skeleton-section-title" />
        <span className="skeleton-block skeleton-section-body" />
      </div>
    ))}
    <span className="sr-only">{t('issues.loadingOne')}</span>
  </div>
  )
}
