import { AppShell } from '@/components/app-shell'

const IssuesLoading = () => (
  <AppShell>
    <div className="issues-loading" role="status">
      <header className="page-header compact-page-header">
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block skeleton-copy" />
      </header>
      <div className="skeleton-filter-row">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <div className="skeleton-table">
        {Array.from({ length: 5 }, (_, index) => <span className="skeleton-block" key={index} />)}
      </div>
      <span className="sr-only">Loading issues</span>
    </div>
  </AppShell>
)

export default IssuesLoading
