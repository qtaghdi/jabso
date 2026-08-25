'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import {
  dashboardQueryKeys,
  issueQueryOptions,
  updateDashboardIssueStatus,
} from '@/lib/dashboard-query'
import { formatCount, formatDateTime, formatLocation } from '@/lib/format'
import type { IssueDetail, StackFrame } from '@/lib/jabso-api'

const BackIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m12.5 4.5-5 5 5 5M8 9.5h8" /></svg>
)

const statusLabel = { unresolved: 'Unresolved', resolved: 'Resolved', ignored: 'Ignored' } as const

const StatusButton = ({ issueId, status, label, active }: {
  issueId: string
  status: keyof typeof statusLabel
  label: string
  active?: boolean
}) => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => updateDashboardIssueStatus(issueId, status),
    onSuccess: (issue) => {
      queryClient.setQueryData(dashboardQueryKeys.issue(issueId), issue)
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'issues'] })
    },
  })
  return (
    <Button
      className={active ? 'status-action-active' : undefined}
      variant="secondary"
      type="button"
      disabled={active || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? 'Updating…' : label}
    </Button>
  )
}

const StackTraceTable = ({ frames }: { frames: StackFrame[] }) => (
  <div className="stack-table-wrap"><table className="stack-table">
    <thead><tr><th scope="col">#</th><th scope="col">Frame</th><th scope="col">Location</th><th scope="col"><span className="sr-only">Copy location</span></th></tr></thead>
    <tbody>{frames.map((frame, index) => (
      <tr key={`${frame.filename}-${frame.function}-${frame.line}-${index}`} className={frame.inApp ? 'in-app-frame' : undefined}>
        <td>{index + 1}</td>
        <td><code>{frame.function ?? '(anonymous)'}</code><span>{frame.inApp ? 'In app' : 'Library'}</span></td>
        <td><code>{formatLocation(frame)}</code></td>
        <td><CopyButton label={`Copy ${formatLocation(frame)}`} value={formatLocation(frame)} /></td>
      </tr>
    ))}</tbody>
  </table></div>
)

type IssueDetailViewProps = {
  initialData: IssueDetail
  issueId: string
}

export const IssueDetailView = ({ initialData, issueId }: IssueDetailViewProps) => {
  const issueQuery = useQuery({ ...issueQueryOptions(issueId), initialData })
  if (issueQuery.isPending) {
    return <div className="issue-detail-loading" role="status"><span className="skeleton-block skeleton-back" /><span className="skeleton-block skeleton-detail-title" /><span className="sr-only">Loading issue</span></div>
  }
  if (issueQuery.isError) {
    return <div className="route-state" role="alert"><h1>Could not load this issue</h1><p>{issueQuery.error.message}</p><Link className="text-link" href="/">Return to Issues</Link></div>
  }
  const issue = issueQuery.data
  const event = issue.latestEvent
  const frames = [...(event?.stacktrace ?? [])].reverse()
  const originalFrames = [...(event?.originalStacktrace ?? [])].reverse()
  const safeContext = Object.entries({
    Environment: event?.environment,
    Release: event?.release,
    Platform: event?.platform,
    ...(event?.context ?? {}),
    ...(event?.tags ?? {}),
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)

  return (
    <>
      <Link className="back-link" href="/"><BackIcon />Back to Issues</Link>
      <header className="issue-detail-header phase-two-detail-header">
        <div className="issue-title-row">
          <div><h1>{issue.title}</h1><p>{issue.exceptionType ?? issue.level}</p></div>
          <div className="status-actions" aria-label="Issue lifecycle actions">
            <span className={`current-status status-${issue.status}`}><span />{statusLabel[issue.status]}</span>
            <StatusButton issueId={issue.id} status="unresolved" label="Reopen" active={issue.status === 'unresolved'} />
            <StatusButton issueId={issue.id} status="resolved" label="Resolve" active={issue.status === 'resolved'} />
            <StatusButton issueId={issue.id} status="ignored" label="Ignore" active={issue.status === 'ignored'} />
          </div>
        </div>
        <dl className="issue-facts">
          {issue.regressedAt ? <div><dt>Lifecycle</dt><dd className="regression-label"><span />Regression</dd></div> : null}
          <div><dt>Event count</dt><dd>{formatCount(issue.eventCount)}</dd></div>
          <div><dt>First seen</dt><dd>{formatDateTime(issue.firstSeenAt)}</dd></div>
          <div><dt>Last seen</dt><dd>{formatDateTime(issue.lastSeenAt)}</dd></div>
          <div><dt>Status changed</dt><dd>{formatDateTime(issue.statusChangedAt)}</dd></div>
        </dl>
      </header>
      <section className="detail-section">
        <h2>Latest occurrence</h2>
        {event ? <dl className="occurrence-grid">
          <div><dt>Environment</dt><dd>{event.environment ?? '—'}</dd></div>
          <div><dt>Release</dt><dd><code>{event.release ?? '—'}</code></dd></div>
          <div><dt>Dist</dt><dd><code>{event.dist || '—'}</code></dd></div>
          <div><dt>Event ID</dt><dd><code>{event.eventId}</code></dd></div>
          <div><dt>Occurred</dt><dd>{formatDateTime(event.occurredAt ?? event.receivedAt)}</dd></div>
        </dl> : <p className="muted-copy">No occurrence is available.</p>}
      </section>
      <section className="detail-section">
        <div className="section-heading-row">
          <h2>Stack trace</h2>
          {event ? <span className={`symbolication-status symbolication-${event.symbolication.status}`}>
            {event.symbolication.status === 'completed' ? 'Source mapped' : event.symbolication.status.replace('_', ' ')}
          </span> : null}
        </div>
        {event?.symbolication.errorCode ? <p className="symbolication-note">Symbolication: {event.symbolication.errorCode.replaceAll('_', ' ')}</p> : null}
        {frames.length === 0 ? <p className="muted-copy">No stack trace was captured.</p> : (
          <StackTraceTable frames={frames} />
        )}
        {event?.symbolication.status === 'completed' ? (
          <details className="original-stack-details">
            <summary>View original minified frames</summary>
            <StackTraceTable frames={originalFrames} />
          </details>
        ) : null}
      </section>
      <section className="detail-section">
        <h2>Release history</h2>
        {issue.releaseHistory.length === 0 ? <p className="muted-copy">No release context is available.</p> : (
          <div className="history-table-wrap"><table className="history-table release-history-table">
            <thead><tr><th scope="col">Release</th><th scope="col">Dist</th><th scope="col">Events</th><th scope="col">First seen</th><th scope="col">Last seen</th><th scope="col">Lifecycle</th></tr></thead>
            <tbody>{issue.releaseHistory.map((release) => (
              <tr key={`${release.release}-${release.dist}`}>
                <td><code>{release.release}</code></td>
                <td><code>{release.dist || '—'}</code></td>
                <td>{formatCount(release.eventCount)}</td>
                <td>{formatDateTime(release.firstSeenAt)}</td>
                <td>{formatDateTime(release.lastSeenAt)}</td>
                <td>{release.regressedAt ? <span className="regression-label"><span />Regressed {formatDateTime(release.regressedAt)}</span> : 'First seen'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <section className="detail-section">
        <h2>Occurrence history</h2>
        <div className="history-table-wrap"><table className="history-table">
          <thead><tr><th scope="col">Event ID</th><th scope="col">Level</th><th scope="col">Environment</th><th scope="col">Release</th><th scope="col">Occurred</th></tr></thead>
          <tbody>{issue.occurrences.map((occurrence) => (
            <tr key={occurrence.eventId}><td><code>{occurrence.eventId}</code></td><td>{occurrence.level}</td><td>{occurrence.environment ?? '—'}</td><td><code>{occurrence.release ?? '—'}</code></td><td>{formatDateTime(occurrence.occurredAt ?? occurrence.receivedAt)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <div className="context-columns">
        <section className="detail-section breadcrumbs-section">
          <h2>Breadcrumbs</h2>
          {event?.breadcrumbs.length ? <ol>{event.breadcrumbs.map((breadcrumb, index) => (
            <li key={`${breadcrumb.timestamp}-${breadcrumb.category}-${index}`}><time>{breadcrumb.timestamp ? formatDateTime(breadcrumb.timestamp) : '—'}</time><span>{breadcrumb.category}</span><p>{breadcrumb.message ?? '—'}</p></li>
          ))}</ol> : <p className="muted-copy">No safe breadcrumbs were captured.</p>}
        </section>
        <section className="detail-section safe-context-section">
          <h2>Safe context</h2>
          {safeContext.length ? <dl>{safeContext.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p className="muted-copy">No safe context was captured.</p>}
        </section>
      </div>
    </>
  )
}
