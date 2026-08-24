import { AppShell } from '@/components/app-shell'

const IssueLoading = () => (
  <AppShell>
    <div className="issue-detail-loading" role="status">
      <span className="skeleton-block skeleton-back" />
      <header className="issue-detail-header">
        <span className="skeleton-block skeleton-detail-title" />
        <span className="skeleton-block skeleton-copy" />
        <div className="skeleton-facts">
          {Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}
        </div>
      </header>
      {Array.from({ length: 3 }, (_, index) => (
        <section className="skeleton-detail-section" key={index}>
          <span className="skeleton-block skeleton-section-title" />
          <span className="skeleton-block skeleton-section-body" />
        </section>
      ))}
      <span className="sr-only">Loading issue</span>
    </div>
  </AppShell>
)

export default IssueLoading
