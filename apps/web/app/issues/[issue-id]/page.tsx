import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { CopyButton } from '@/components/copy-button'
import { formatCount, formatDateTime, formatLocation } from '@/lib/format'
import { getIssue } from '@/lib/jabso-api'

export const dynamic = 'force-dynamic'

type IssuePageProps = { params: Promise<{ 'issue-id': string }> }

export const generateMetadata = async ({ params }: IssuePageProps): Promise<Metadata> => {
  const { 'issue-id': issueId } = await params
  const issue = await getIssue(issueId)
  return { title: issue?.title ?? 'Issue not found' }
}

const BackIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m12.5 4.5-5 5 5 5M8 9.5h8" /></svg>
)

const IssuePage = async ({ params }: IssuePageProps) => {
  const { 'issue-id': issueId } = await params
  const issue = await getIssue(issueId)
  if (!issue) notFound()
  const event = issue.latestEvent
  const frames = [...(event?.stacktrace ?? [])].reverse()
  const tags = Object.entries(event?.tags ?? {}).sort(([left], [right]) => left.localeCompare(right))

  return (
    <AppShell>
      <Link className="back-link" href="/"><BackIcon />Back to Issues</Link>
      <header className="issue-detail-header">
        <h1>{issue.title}</h1>
        <dl className="issue-facts">
          <div><dt>Severity</dt><dd><span className="severity-mark" />{issue.exceptionType ?? issue.level}</dd></div>
          <div><dt>Event count</dt><dd>{formatCount(issue.eventCount)}</dd></div>
          <div><dt>First seen</dt><dd>{formatDateTime(issue.firstSeenAt)}</dd></div>
          <div><dt>Last seen</dt><dd>{formatDateTime(issue.lastSeenAt)}</dd></div>
        </dl>
      </header>
      <section className="detail-section">
        <h2>Latest occurrence</h2>
        {event ? (
          <dl className="occurrence-grid">
            <div><dt>Environment</dt><dd>{event.environment ?? '—'}</dd></div>
            <div><dt>Release</dt><dd><code>{event.release ?? '—'}</code></dd></div>
            <div><dt>Event ID</dt><dd><code>{event.eventId}</code></dd></div>
            <div><dt>Occurred</dt><dd>{formatDateTime(event.occurredAt ?? event.receivedAt)}</dd></div>
          </dl>
        ) : <p className="muted-copy">No occurrence is available.</p>}
      </section>
      <section className="detail-section">
        <h2>Stack trace</h2>
        {frames.length === 0 ? <p className="muted-copy">No stack trace was captured.</p> : (
          <div className="stack-table-wrap">
            <table className="stack-table">
              <thead><tr><th scope="col">#</th><th scope="col">Frame</th><th scope="col">Location</th><th scope="col"><span className="sr-only">Copy location</span></th></tr></thead>
              <tbody>{frames.map((frame, index) => (
                <tr key={`${frame.filename}-${frame.function}-${frame.line}-${index}`} className={frame.inApp ? 'in-app-frame' : undefined}>
                  <td>{index + 1}</td>
                  <td><code>{frame.function ?? '(anonymous)'}</code><span>{frame.inApp ? 'In app' : 'Library'}</span></td>
                  <td><code>{formatLocation(frame)}</code></td>
                  <td><CopyButton label={`Copy ${formatLocation(frame)}`} value={formatLocation(frame)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      <section className="detail-section tags-section">
        <h2>Tags</h2>
        {tags.length === 0 ? <p className="muted-copy">No tags were captured.</p> : (
          <dl>{tags.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        )}
      </section>
    </AppShell>
  )
}

export default IssuePage
