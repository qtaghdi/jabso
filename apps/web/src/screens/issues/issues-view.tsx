'use client'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent } from 'react'
import { GettingStarted } from 'src/screens/issues/getting-started'
import { Button, buttonClassName } from 'src/shared/ui/button'
import { Select } from 'src/shared/ui/select'
import { issuesQueryOptions, issueQueryOptions } from 'src/shared/query/dashboard-query'
import { formatCount, formatDateTime } from 'src/shared/format'
import type { IssueFilters, IssueSummary } from 'src/shared/api/issues'
import type { IssuesResponse } from 'src/shared/query/dashboard-types'

const ViewIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7.5 4.5 5 5-5 5" /></svg>
)

const statusLabel: Record<IssueSummary['status'], string> = {
  ignored: 'Ignored',
  resolved: 'Resolved',
  unresolved: 'Unresolved',
}

const filtersFromParameters = (parameters: URLSearchParams): IssueFilters => ({
  cursor: parameters.get('cursor') || undefined,
  direction: parameters.get('direction') as IssueFilters['direction'] || undefined,
  environment: parameters.get('environment') || undefined,
  level: parameters.get('level') || undefined,
  period: parameters.get('period') as IssueFilters['period'] || undefined,
  query: parameters.get('query') || undefined,
  release: parameters.get('release') || undefined,
  status: parameters.get('status') as IssueFilters['status'] || undefined,
})

const pageHref = (filters: IssueFilters, cursor: string, direction: 'next' | 'previous') => {
  const parameters = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== 'cursor' && key !== 'direction') parameters.set(key, value)
  }
  parameters.set('cursor', cursor)
  parameters.set('direction', direction)
  return `/?${parameters}`
}

const IssuesLoading = () => (
  <div className="issues-inline-loading" role="status">
    <span className="skeleton-block skeleton-title" />
    <span className="skeleton-block skeleton-copy" />
    <div className="skeleton-table">{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}</div>
    <span className="sr-only">Loading issues</span>
  </div>
)

type IssuesViewProps = {
  initialData: IssuesResponse
}

export const IssuesView = ({ initialData }: IssuesViewProps) => {
  const router = useRouter()
  const searchParameters = useSearchParams()
  const queryClient = useQueryClient()
  const search = searchParameters.toString()
  const filters = filtersFromParameters(searchParameters)
  const hasActiveFilters = Object.values(filters).some(Boolean)
  const issuesQuery = useQuery({
    ...issuesQueryOptions(search),
    initialData,
    placeholderData: keepPreviousData,
  })

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parameters = new URLSearchParams()
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value) parameters.set(key, value)
    }
    const nextSearch = parameters.toString()
    router.push(nextSearch ? `/?${nextSearch}` : '/')
  }

  if (issuesQuery.isPending) return <IssuesLoading />
  if (issuesQuery.isError) {
    return <div className="route-state" role="alert"><h1>Could not load Issues</h1><p>{issuesQuery.error.message}</p><Button onClick={() => issuesQuery.refetch()}>Try again</Button></div>
  }

  const { activeProject, facets, items, nextCursor, previousCursor } = issuesQuery.data
  return (
    <>
      <header className="page-header compact-page-header">
        <div className="page-heading-row">
          <div><h1>Issues</h1><p>Find the errors that need attention.</p></div>
          {activeProject ? <Link className="active-project-link" href="/projects">
            <span>Project</span><strong>{activeProject.name}</strong>
          </Link> : null}
        </div>
      </header>
      {activeProject && (items.length > 0 || hasActiveFilters) ? <form className="filter-bar phase-two-filters" key={search} method="get" onSubmit={applyFilters}>
        <label className="filter-search">
          <span className="sr-only">Filter issues</span>
          <input name="query" type="search" placeholder="Filter issues…" defaultValue={filters.query} />
        </label>
        <Select hideLabel label="Status" name="status" defaultValue={filters.status ?? ''}>
          <option value="">All statuses</option>
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </Select>
        <Select hideLabel label="Level" name="level" defaultValue={filters.level ?? ''}>
          <option value="">All levels</option>
          {facets.levels.map((level) => <option key={level} value={level}>{level}</option>)}
        </Select>
        <Select hideLabel label="Environment" name="environment" defaultValue={filters.environment ?? ''}>
          <option value="">All environments</option>
          {facets.environments.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
        </Select>
        <Select hideLabel label="Release" name="release" defaultValue={filters.release ?? ''}>
          <option value="">All releases</option>
          {facets.releases.map((release) => <option key={release} value={release}>{release}</option>)}
        </Select>
        <Select hideLabel label="Last seen" name="period" defaultValue={filters.period ?? ''}>
          <option value="">Any time</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </Select>
        <Button type="submit">Apply</Button>
        <Link className={buttonClassName('secondary', 'clear-filter')} href="/">Clear</Link>
      </form> : null}
      {!activeProject ? <section className="empty-state project-empty-state">
        <h2>Create your first project</h2>
        <p>A project gives Jabso an isolated DSN, issue inbox, and release history.</p>
        <Link className={buttonClassName('primary')} href="/projects">Create project</Link>
      </section> : items.length === 0 ? (
        hasActiveFilters ? <section className="empty-state">
          <h2>No matching issues</h2>
          <p>Clear the filters or send an error from the SDK smoke test.</p>
          <Link className="text-link" href="/smoke-test">Open SDK smoke test</Link>
        </section> : <GettingStarted dsn={activeProject.dsn} projectName={activeProject.name} />
      ) : (
        <div className={`issue-table-wrap ${issuesQuery.isPlaceholderData ? 'query-refreshing' : ''}`}>
          <table className="issue-table phase-two-table">
            <thead><tr><th scope="col">Status</th><th scope="col">Level</th><th scope="col">Exception type / title</th><th scope="col">Events</th><th scope="col">Environment</th><th scope="col">Release</th><th scope="col">Regression</th><th scope="col">Last seen</th><th scope="col"><span className="sr-only">Open issue</span></th></tr></thead>
            <tbody>{items.map((issue) => {
              const prefetchIssue = () => queryClient.prefetchQuery(issueQueryOptions(issue.id))
              return (
                <tr key={issue.id}>
                  <td data-label="Status"><span className={`status-mark status-${issue.status}`} aria-hidden="true" />{statusLabel[issue.status]}</td>
                  <td data-label="Level"><span className="severity-label">{issue.level}</span></td>
                  <td data-label="Error" className="issue-title-cell"><span>{issue.exceptionType ?? 'Error'}</span><Link href={`/issues/${issue.id}`} onFocus={prefetchIssue} onMouseEnter={prefetchIssue}>{issue.title}</Link></td>
                  <td data-label="Events">{formatCount(issue.eventCount)}</td>
                  <td data-label="Environment">{issue.environment ?? '—'}</td>
                  <td data-label="Release"><code>{issue.release ?? '—'}</code></td>
                  <td data-label="Regression">{issue.regressedAt ? <span className="regression-label"><span />Yes</span> : '—'}</td>
                  <td data-label="Last seen">{formatDateTime(issue.lastSeenAt)}</td>
                  <td className="issue-row-action"><Link href={`/issues/${issue.id}`} aria-label={`Open ${issue.title}`} onFocus={prefetchIssue} onMouseEnter={prefetchIssue}><ViewIcon /></Link></td>
                </tr>
              )
            })}</tbody>
          </table>
          <div className="pagination-bar">
            {previousCursor ? <Link href={pageHref(filters, previousCursor, 'previous')}>Previous</Link> : <span />}
            <p>Showing {items.length} {items.length === 1 ? 'issue' : 'issues'}</p>
            {nextCursor ? <Link href={pageHref(filters, nextCursor, 'next')}>Next <ViewIcon /></Link> : <span />}
          </div>
        </div>
      )}
    </>
  )
}
