export const IssueDetailSkeleton = () => (
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
    <span className="sr-only">Loading issue</span>
  </div>
)
