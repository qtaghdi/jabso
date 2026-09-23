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
import { dashboardSectionHeadingClass, dashboardSurfaceClass, issueDetailSectionClass } from 'src/shared/ui/dashboard-styles'

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
      className={active ? 'bg-subtle' : undefined}
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
  return <div className="stack-table-wrap overflow-x-auto rounded-xl border border-line"><table className="stack-table">
    <thead className="bg-[#f8fafb]"><tr><th scope="col">#</th><th scope="col">{t('issues.frame')}</th><th scope="col">{t('issues.location')}</th><th scope="col"><span className="sr-only">{t('issues.copyLocation', { location: t('issues.location') })}</span></th></tr></thead>
    <tbody>{frames.map((frame, index) => (
      <tr key={`${frame.filename}-${frame.function}-${frame.line}-${index}`} className={frame.inApp ? 'bg-[color-mix(in_srgb,var(--accent-soft)_42%,white)] shadow-[inset_3px_0_var(--accent)]' : undefined}>
        <td>{index + 1}</td>
        <td><code>{frame.function ?? t('issues.anonymous')}</code><span className={frame.inApp ? '!text-danger' : undefined}>{frame.inApp ? t('issues.inApp') : t('issues.library')}</span></td>
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
    return <div className="route-state" role="alert"><h1>{t('issues.couldNotLoadOne')}</h1><p>{issueQuery.error.message}</p><Link className="font-semibold text-link underline-offset-3" href="/">{t('issues.return')}</Link></div>
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
      <Link className="mb-7 inline-flex items-center gap-2 text-link no-underline hover:underline [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]" href="/"><BackIcon />{t('issues.back')}</Link>
      <header className={`${dashboardSurfaceClass} mb-4 p-7 max-[620px]:p-[22px]`}>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          <div className="min-w-0"><h1 className="m-0 max-w-[1100px] [overflow-wrap:anywhere] text-[clamp(32px,3vw,42px)] leading-[1.08] tracking-[-0.04em] text-balance max-[620px]:text-[29px]">{issue.title}</h1><p className="mt-2 mb-0 text-muted">{issue.exceptionType ?? issue.level}</p></div>
          <div className="flex flex-wrap items-center justify-start gap-2" aria-label={t('issues.lifecycleActions')}>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-subtle px-3.5 text-[13px] font-semibold"><span className={`size-2 rounded-full ${issue.status === 'unresolved' ? 'bg-danger' : issue.status === 'ignored' ? 'border border-dashed border-[#7a8490] bg-transparent' : 'bg-[#7a8490]'}`} />{t(`issues.${issue.status}` as 'issues.ignored' | 'issues.resolved' | 'issues.unresolved')}</span>
            <StatusButton issueId={issue.id} status="unresolved" label={t('issues.reopen')} active={issue.status === 'unresolved'} />
            <StatusButton issueId={issue.id} status="resolved" label={t('issues.resolve')} active={issue.status === 'resolved'} />
            <StatusButton issueId={issue.id} status="ignored" label={t('issues.ignore')} active={issue.status === 'ignored'} />
          </div>
        </div>
        <dl className="mt-7 flex flex-wrap gap-y-4 [&_div]:flex [&_div]:items-center [&_div]:gap-3.5 [&_div]:border-l [&_div]:border-line [&_div]:px-7 [&_div:first-child]:border-l-0 [&_div:first-child]:pl-0 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 max-[620px]:grid max-[620px]:grid-cols-2 max-[620px]:[&_div]:border-l-0 max-[620px]:[&_div]:px-0">
          {issue.regressedAt ? <div><dt>{t('issues.lifecycle')}</dt><dd className="regression-label"><span />{t('issues.regression')}</dd></div> : null}
          <div><dt>{t('issues.eventCount')}</dt><dd>{formatCount(issue.eventCount, locale)}</dd></div>
          <div><dt>{t('issues.firstSeen')}</dt><dd>{formatDateTime(issue.firstSeenAt, locale)}</dd></div>
          <div><dt>{t('issues.lastSeen')}</dt><dd>{formatDateTime(issue.lastSeenAt, locale)}</dd></div>
          <div><dt>{t('issues.statusChanged')}</dt><dd>{formatDateTime(issue.statusChangedAt, locale)}</dd></div>
        </dl>
      </header>
      <section className={issueDetailSectionClass}>
        <h2>{t('issues.latestOccurrence')}</h2>
        {event ? <dl className="m-0 grid grid-cols-[.7fr_.8fr_.6fr_1.5fr_1.2fr] max-[900px]:grid-cols-2 max-[900px]:gap-y-5 [&_div]:min-w-0 [&_div]:border-l [&_div]:border-line [&_div]:px-6 [&_div:first-child]:border-l-0 [&_div:first-child]:pl-0 max-[900px]:[&_div:nth-child(odd)]:border-l-0 max-[900px]:[&_div:nth-child(odd)]:pl-0 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:mt-2 [&_dd]:mb-0 [&_dd]:[overflow-wrap:anywhere] [&_code]:text-[13px]">
          <div><dt>{t('issues.environment')}</dt><dd>{event.environment ?? '—'}</dd></div>
          <div><dt>{t('issues.release')}</dt><dd><code>{event.release ?? '—'}</code></dd></div>
          <div><dt>{t('issues.dist')}</dt><dd><code>{event.dist || '—'}</code></dd></div>
          <div><dt>{t('issues.eventId')}</dt><dd><code>{event.eventId}</code></dd></div>
          <div><dt>{t('issues.occurred')}</dt><dd>{formatDateTime(event.occurredAt ?? event.receivedAt, locale)}</dd></div>
        </dl> : <p className="muted-copy">{t('issues.noOccurrence')}</p>}
      </section>
      <section className={issueDetailSectionClass}>
        <div className={`${dashboardSectionHeadingClass} mb-5`}>
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
      <section className={issueDetailSectionClass}>
        <h2>{t('issues.releaseHistory')}</h2>
        {issue.releaseHistory.length === 0 ? <p className="muted-copy">{t('issues.noReleaseContext')}</p> : (
          <div className="history-table-wrap overflow-x-auto rounded-xl border border-line"><table className="history-table release-history-table">
            <thead className="bg-[#f8fafb]"><tr><th scope="col">{t('issues.release')}</th><th scope="col">{t('issues.dist')}</th><th scope="col">{t('issues.events')}</th><th scope="col">{t('issues.firstSeen')}</th><th scope="col">{t('issues.lastSeen')}</th><th scope="col">{t('issues.lifecycle')}</th></tr></thead>
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
      <section className={issueDetailSectionClass}>
        <h2>{t('issues.occurrenceHistory')}</h2>
        <div className="history-table-wrap overflow-x-auto rounded-xl border border-line"><table className="history-table">
          <thead className="bg-[#f8fafb]"><tr><th scope="col">{t('issues.eventId')}</th><th scope="col">{t('issues.level')}</th><th scope="col">{t('issues.environment')}</th><th scope="col">{t('issues.release')}</th><th scope="col">{t('issues.occurred')}</th></tr></thead>
          <tbody>{issue.occurrences.map((occurrence) => (
            <tr key={occurrence.eventId}><td><code>{occurrence.eventId}</code></td><td>{occurrence.level}</td><td>{occurrence.environment ?? '—'}</td><td><code>{occurrence.release ?? '—'}</code></td><td>{formatDateTime(occurrence.occurredAt ?? occurrence.receivedAt, locale)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <section className={`${issueDetailSectionClass} breadcrumbs-section max-[900px]:mb-0`}>
          <h2>{t('issues.breadcrumbs')}</h2>
          {event?.breadcrumbs.length ? <ol>{event.breadcrumbs.map((breadcrumb, index) => (
            <li key={`${breadcrumb.timestamp}-${breadcrumb.category}-${index}`}><time>{breadcrumb.timestamp ? formatDateTime(breadcrumb.timestamp, locale) : '—'}</time><span>{breadcrumb.category}</span><p>{breadcrumb.message ?? '—'}</p></li>
          ))}</ol> : <p className="muted-copy">{t('issues.noBreadcrumbs')}</p>}
        </section>
        <section className={`${issueDetailSectionClass} safe-context-section`}>
          <h2>{t('issues.safeContext')}</h2>
          {safeContext.length ? <dl>{safeContext.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p className="muted-copy">{t('issues.noSafeContext')}</p>}
        </section>
      </div>
    </>
  )
}
