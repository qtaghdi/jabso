import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { formatCount, formatDateTime } from '@/lib/format'
import { listIssues } from '@/lib/jabso-api'

export const dynamic = 'force-dynamic'

type IssuesPageProps = {
  searchParams: Promise<{ query?: string; environment?: string }>
}

const ViewIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7.5 4.5 5 5-5 5" /></svg>
)

const IssuesPage = async ({ searchParams }: IssuesPageProps) => {
  const filters = await searchParams
  const { items } = await listIssues(filters)
  return (
    <AppShell>
      <header className="page-header">
        <h1>Issues</h1>
        <p>Errors grouped by a stable stack trace and normalized message.</p>
      </header>
      <form className="filter-bar" method="get">
        <label>
          <span className="sr-only">Filter issues</span>
          <input name="query" type="search" placeholder="Filter issues…" defaultValue={filters.query} />
        </label>
        <label>
          <span className="sr-only">Environment</span>
          <select name="environment" defaultValue={filters.environment ?? ''}>
            <option value="">All environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>
      {items.length === 0 ? (
        <section className="empty-state">
          <h2>No unresolved issues</h2>
          <p>Send an error from the SDK smoke test and it will appear here.</p>
          <Link className="text-link" href="/smoke-test">Open SDK smoke test</Link>
        </section>
      ) : (
        <div className="issue-table-wrap">
          <table className="issue-table">
            <thead><tr><th scope="col">Severity</th><th scope="col">Error</th><th scope="col">Events</th><th scope="col">Environment</th><th scope="col">Release</th><th scope="col">Last seen</th><th scope="col"><span className="sr-only">Open issue</span></th></tr></thead>
            <tbody>
              {items.map((issue) => (
                <tr key={issue.id}>
                  <td data-label="Severity"><span className="severity-mark" aria-hidden="true" /><span className="severity-label">{issue.exceptionType ?? issue.level}</span></td>
                  <td data-label="Error" className="issue-title-cell"><Link href={`/issues/${issue.id}`}>{issue.title}</Link><code>{issue.id.slice(-12)}</code></td>
                  <td data-label="Events">{formatCount(issue.eventCount)}</td>
                  <td data-label="Environment">{issue.environment ?? '—'}</td>
                  <td data-label="Release"><code>{issue.release ?? '—'}</code></td>
                  <td data-label="Last seen">{formatDateTime(issue.lastSeenAt)}</td>
                  <td className="issue-row-action"><Link href={`/issues/${issue.id}`} aria-label={`Open ${issue.title}`}><ViewIcon /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-caption">Showing {items.length} unresolved {items.length === 1 ? 'issue' : 'issues'}</p>
        </div>
      )}
    </AppShell>
  )
}

export default IssuesPage
