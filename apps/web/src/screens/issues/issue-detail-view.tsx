'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { CopyButton } from 'src/shared/ui/copy-button'
import { Button } from 'src/shared/ui/button'
import {
  dashboardQueryKeys,
  issueQueryOptions,
  updateDashboardIssueStatus,
} from 'src/shared/query/dashboard-query'
import { formatCount, formatDateTime, formatLocation } from 'src/shared/format'
import type { IssueDetail, StackFrame } from 'src/shared/api/issues'
import { useI18n } from 'src/shared/i18n/i18n-provider'

const BackIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m12.5 4.5-5 5 5 5M8 9.5h8" /></svg>
)

const symbolicationKey = {
  completed: 'issues.sourceMapped',
  failed: 'issues.symbolicationFailed',
  missing: 'issues.symbolicationMissing',
  not_applicable: 'issues.symbolicationNotApplicable',
  pending: 'issues.symbolicationPending',
} as const

const StatusButton = ({ issueId, status, label, active }: {
  issueId: string
  status: 'ignored' | 'resolved' | 'unresolved'
  label: string
  active?: boolean
}) => {
  const { t } = useI18n()
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
      {mutation.isPending ? t('issues.updating') : label}
    </Button>
  )
}

const StackTraceTable = ({ frames }: { frames: StackFrame[] }) => {
  const { t } = useI18n()
  return <div className="stack-table-wrap"><table className="stack-table">
    <thead><tr><th scope="col">#</th><th scope="col">{t('issues.frame')}</th><th scope="col">{t('issues.location')}</th><th scope="col"><span className="sr-only">{t('issues.copyLocation', { location: t('issues.location') })}</span></th></tr></thead>
    <tbody>{frames.map((frame, index) => (
      <tr key={`${frame.filename}-${frame.function}-${frame.line}-${index}`} className={frame.inApp ? 'in-app-frame' : undefined}>
        <td>{index + 1}</td>
        <td><code>{frame.function ?? t('issues.anonymous')}</code><span>{frame.inApp ? t('issues.inApp') : t('issues.library')}</span></td>
        <td><code>{formatLocation(frame)}</code></td>
        <td><CopyButton copiedLabel={t('common.copied')} label={t('issues.copyLocation', { location: formatLocation(frame) })} value={formatLocation(frame)} /></td>
      </tr>
    ))}</tbody>
  </table></div>
}

type IssueDetailViewProps = {
  initialData: IssueDetail
  issueId: string
}

export const IssueDetailView = ({ initialData, issueId }: IssueDetailViewProps) => {
  const { locale, t } = useI18n()
  const issueQuery = useQuery({ ...issueQueryOptions(issueId), initialData })
  if (issueQuery.isPending) {
    return <div className="issue-detail-loading" role="status"><span className="skeleton-block skeleton-back" /><span className="skeleton-block skeleton-detail-title" /><span className="sr-only">{t('issues.loadingOne')}</span></div>
  }
  if (issueQuery.isError) {
    return <div className="route-state" role="alert"><h1>{t('issues.couldNotLoadOne')}</h1><p>{issueQuery.error.message}</p><Link className="text-link" href="/">{t('issues.return')}</Link></div>
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
      <Link className="back-link" href="/"><BackIcon />{t('issues.back')}</Link>
      <header className="issue-detail-header phase-two-detail-header">
        <div className="issue-title-row">
          <div><h1>{issue.title}</h1><p>{issue.exceptionType ?? issue.level}</p></div>
          <div className="status-actions" aria-label={t('issues.lifecycleActions')}>
            <span className={`current-status status-${issue.status}`}><span />{t(`issues.${issue.status}` as 'issues.ignored' | 'issues.resolved' | 'issues.unresolved')}</span>
            <StatusButton issueId={issue.id} status="unresolved" label={t('issues.reopen')} active={issue.status === 'unresolved'} />
            <StatusButton issueId={issue.id} status="resolved" label={t('issues.resolve')} active={issue.status === 'resolved'} />
            <StatusButton issueId={issue.id} status="ignored" label={t('issues.ignore')} active={issue.status === 'ignored'} />
          </div>
        </div>
        <dl className="issue-facts">
          {issue.regressedAt ? <div><dt>{t('issues.lifecycle')}</dt><dd className="regression-label"><span />{t('issues.regression')}</dd></div> : null}
          <div><dt>{t('issues.eventCount')}</dt><dd>{formatCount(issue.eventCount, locale)}</dd></div>
          <div><dt>{t('issues.firstSeen')}</dt><dd>{formatDateTime(issue.firstSeenAt, locale)}</dd></div>
          <div><dt>{t('issues.lastSeen')}</dt><dd>{formatDateTime(issue.lastSeenAt, locale)}</dd></div>
          <div><dt>{t('issues.statusChanged')}</dt><dd>{formatDateTime(issue.statusChangedAt, locale)}</dd></div>
        </dl>
      </header>
      <section className="detail-section">
        <h2>{t('issues.latestOccurrence')}</h2>
        {event ? <dl className="occurrence-grid">
          <div><dt>{t('issues.environment')}</dt><dd>{event.environment ?? '—'}</dd></div>
          <div><dt>{t('issues.release')}</dt><dd><code>{event.release ?? '—'}</code></dd></div>
          <div><dt>{t('issues.dist')}</dt><dd><code>{event.dist || '—'}</code></dd></div>
          <div><dt>{t('issues.eventId')}</dt><dd><code>{event.eventId}</code></dd></div>
          <div><dt>{t('issues.occurred')}</dt><dd>{formatDateTime(event.occurredAt ?? event.receivedAt, locale)}</dd></div>
        </dl> : <p className="muted-copy">{t('issues.noOccurrence')}</p>}
      </section>
      <section className="detail-section">
        <div className="section-heading-row">
          <h2>{t('issues.stackTrace')}</h2>
          {event ? <span className={`symbolication-status symbolication-${event.symbolication.status}`}>
            {t(symbolicationKey[event.symbolication.status])}
          </span> : null}
        </div>
        {event?.symbolication.errorCode ? <p className="symbolication-note">{t('issues.symbolication')}: {event.symbolication.errorCode.replaceAll('_', ' ')}</p> : null}
        {frames.length === 0 ? <p className="muted-copy">{t('issues.noStackTrace')}</p> : (
          <StackTraceTable frames={frames} />
        )}
        {event?.symbolication.status === 'completed' ? (
          <details className="original-stack-details">
            <summary>{t('issues.viewOriginal')}</summary>
            <StackTraceTable frames={originalFrames} />
          </details>
        ) : null}
      </section>
      <section className="detail-section">
        <h2>{t('issues.releaseHistory')}</h2>
        {issue.releaseHistory.length === 0 ? <p className="muted-copy">{t('issues.noReleaseContext')}</p> : (
          <div className="history-table-wrap"><table className="history-table release-history-table">
            <thead><tr><th scope="col">{t('issues.release')}</th><th scope="col">{t('issues.dist')}</th><th scope="col">{t('issues.events')}</th><th scope="col">{t('issues.firstSeen')}</th><th scope="col">{t('issues.lastSeen')}</th><th scope="col">{t('issues.lifecycle')}</th></tr></thead>
            <tbody>{issue.releaseHistory.map((release) => (
              <tr key={`${release.release}-${release.dist}`}>
                <td><code>{release.release}</code></td>
                <td><code>{release.dist || '—'}</code></td>
                <td>{formatCount(release.eventCount, locale)}</td>
                <td>{formatDateTime(release.firstSeenAt, locale)}</td>
                <td>{formatDateTime(release.lastSeenAt, locale)}</td>
                <td>{release.regressedAt ? <span className="regression-label"><span />{t('issues.regressed', { date: formatDateTime(release.regressedAt, locale) })}</span> : t('issues.firstSeen')}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <section className="detail-section">
        <h2>{t('issues.occurrenceHistory')}</h2>
        <div className="history-table-wrap"><table className="history-table">
          <thead><tr><th scope="col">{t('issues.eventId')}</th><th scope="col">{t('issues.level')}</th><th scope="col">{t('issues.environment')}</th><th scope="col">{t('issues.release')}</th><th scope="col">{t('issues.occurred')}</th></tr></thead>
          <tbody>{issue.occurrences.map((occurrence) => (
            <tr key={occurrence.eventId}><td><code>{occurrence.eventId}</code></td><td>{occurrence.level}</td><td>{occurrence.environment ?? '—'}</td><td><code>{occurrence.release ?? '—'}</code></td><td>{formatDateTime(occurrence.occurredAt ?? occurrence.receivedAt, locale)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <div className="context-columns">
        <section className="detail-section breadcrumbs-section">
          <h2>{t('issues.breadcrumbs')}</h2>
          {event?.breadcrumbs.length ? <ol>{event.breadcrumbs.map((breadcrumb, index) => (
            <li key={`${breadcrumb.timestamp}-${breadcrumb.category}-${index}`}><time>{breadcrumb.timestamp ? formatDateTime(breadcrumb.timestamp, locale) : '—'}</time><span>{breadcrumb.category}</span><p>{breadcrumb.message ?? '—'}</p></li>
          ))}</ol> : <p className="muted-copy">{t('issues.noBreadcrumbs')}</p>}
        </section>
        <section className="detail-section safe-context-section">
          <h2>{t('issues.safeContext')}</h2>
          {safeContext.length ? <dl>{safeContext.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p className="muted-copy">{t('issues.noSafeContext')}</p>}
        </section>
      </div>
    </>
  )
}
