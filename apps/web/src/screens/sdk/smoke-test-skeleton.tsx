export const SmokeTestSkeleton = () => (
  <div className="dashboard-page-loading smoke-test-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <span className="skeleton-block skeleton-smoke-panel" />
    <span className="skeleton-block skeleton-back" />
    <span className="sr-only">Loading smoke test</span>
  </div>
)
