'use client'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, type FormEvent } from 'react'
import { GettingStarted } from 'src/screens/issues/getting-started'
import { rememberIssuesPageState } from 'src/screens/issues/issues-page-skeleton'
import { Button, buttonClassName } from 'src/shared/ui/button'
import { Select } from 'src/shared/ui/select'
import { issuesQueryOptions, issueQueryOptions } from 'src/shared/query/dashboard-query'
import { formatCount, formatDateTime } from 'src/shared/format'
import type { IssueFilters } from 'src/shared/api/issues'
import type { IssuesResponse } from 'src/shared/query/dashboard-types'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { dashboardEmptyStateClass, dashboardPageHeaderClass, dashboardSurfaceClass } from 'src/shared/ui/dashboard-styles'

const ViewIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7.5 4.5 5 5-5 5" /></svg>
)

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

const IssuesLoading = ({ label }: { label: string }) => (
  <div className="issues-inline-loading" role="status">
    <span className="skeleton-block skeleton-title" />
    <span className="skeleton-block skeleton-copy" />
    <div className="skeleton-table">{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}</div>
    <span className="sr-only">{label}</span>
  </div>
)

type IssuesViewProps = {
  initialData: IssuesResponse
}

export const IssuesView = ({ initialData }: IssuesViewProps) => {
  const { locale, t } = useI18n()
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

  useEffect(() => {
    if (issuesQuery.data) rememberIssuesPageState(issuesQuery.data)
  }, [issuesQuery.data])

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parameters = new URLSearchParams()
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value) parameters.set(key, value)
    }
    const nextSearch = parameters.toString()
    router.push(nextSearch ? `/?${nextSearch}` : '/')
  }

  if (issuesQuery.isPending) return <IssuesLoading label={t('issues.loading')} />
  if (issuesQuery.isError) {
    return <div className="route-state" role="alert"><h1>{t('issues.couldNotLoad')}</h1><p>{issuesQuery.error.message}</p><Button onClick={() => issuesQuery.refetch()}>{t('common.tryAgain')}</Button></div>
  }

  const { activeProject, facets, items, nextCursor, previousCursor } = issuesQuery.data
  return (
    <>
      <header className={dashboardPageHeaderClass}>
        <div className="flex items-start justify-between gap-7 max-[620px]:grid">
          <div><h1>{t('issues.title')}</h1><p>{t('issues.description')}</p></div>
          {activeProject ? <Link className="grid min-w-52 max-w-72 gap-1 rounded-xl border border-line bg-panel px-3.5 py-2.5 no-underline shadow-xs transition-[background-color,border-color] duration-150 hover:border-line-strong hover:bg-subtle max-[620px]:w-full max-[620px]:max-w-none" href="/projects">
            <span className="text-[9px] font-bold tracking-[0.08em] text-muted uppercase">{t('issues.project')}</span><strong className="truncate text-xs">{activeProject.name}</strong>
          </Link> : null}
        </div>
      </header>
      {activeProject && (items.length > 0 || hasActiveFilters) ? <form className={`${dashboardSurfaceClass} mb-5 grid grid-cols-[minmax(250px,1.7fr)_repeat(5,minmax(124px,.72fr))_auto_auto] gap-2.5 p-3.5 max-[900px]:grid-cols-3 max-[620px]:grid-cols-[1fr_auto] max-[620px]:p-3`} key={search} method="get" onSubmit={applyFilters}>
        <label className="min-w-0 max-[900px]:col-span-full max-[620px]:col-span-full">
          <span className="sr-only">{t('issues.filter')}</span>
          <input className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3.5 text-sm text-ink focus:border-focus focus:ring-3 focus:ring-focus/15 focus:outline-none" name="query" type="search" placeholder={t('issues.filterPlaceholder')} defaultValue={filters.query} />
        </label>
        <Select hideLabel label={t('issues.status')} name="status" defaultValue={filters.status ?? ''}>
          <option value="">{t('issues.allStatuses')}</option>
          <option value="unresolved">{t('issues.unresolved')}</option>
          <option value="resolved">{t('issues.resolved')}</option>
          <option value="ignored">{t('issues.ignored')}</option>
        </Select>
        <Select hideLabel label={t('issues.level')} name="level" defaultValue={filters.level ?? ''}>
          <option value="">{t('issues.allLevels')}</option>
          {facets.levels.map((level) => <option key={level} value={level}>{level}</option>)}
        </Select>
        <Select hideLabel label={t('issues.environment')} name="environment" defaultValue={filters.environment ?? ''}>
          <option value="">{t('issues.allEnvironments')}</option>
          {facets.environments.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
        </Select>
        <Select hideLabel label={t('issues.release')} name="release" defaultValue={filters.release ?? ''}>
          <option value="">{t('issues.allReleases')}</option>
          {facets.releases.map((release) => <option key={release} value={release}>{release}</option>)}
        </Select>
        <Select hideLabel label={t('issues.lastSeen')} name="period" defaultValue={filters.period ?? ''}>
          <option value="">{t('issues.anyTime')}</option>
          <option value="24h">{t('issues.last24Hours')}</option>
          <option value="7d">{t('issues.last7Days')}</option>
          <option value="30d">{t('issues.last30Days')}</option>
        </Select>
        <Button type="submit">{t('issues.apply')}</Button>
        <Link className={buttonClassName('secondary', 'min-h-11 rounded-lg px-4 text-[13px] font-semibold')} href="/">{t('issues.clear')}</Link>
      </form> : null}
      {!activeProject ? <section className={`${dashboardEmptyStateClass} project-empty-state`}>
        <h2>{t('issues.createFirst')}</h2>
        <p>{t('issues.createFirstDescription')}</p>
        <Link className={buttonClassName('primary')} href="/projects">{t('projects.create')}</Link>
      </section> : items.length === 0 ? (
        hasActiveFilters ? <section className={dashboardEmptyStateClass}>
          <h2>{t('issues.noMatches')}</h2>
          <p>{t('issues.noMatchesDescription')}</p>
          <Link className="font-semibold text-link underline-offset-3" href="/smoke-test">{t('issues.openSmokeTest')}</Link>
        </section> : <GettingStarted dsn={activeProject.dsn} projectName={activeProject.name} />
      ) : (
        <div className={`issue-table-wrap overflow-hidden rounded-2xl border border-line bg-panel shadow-card ${issuesQuery.isPlaceholderData ? 'query-refreshing' : ''}`}>
          <table className="issue-table phase-two-table">
            <thead className="bg-[#f8fafb]"><tr><th scope="col">{t('issues.status')}</th><th scope="col">{t('issues.level')}</th><th scope="col">{t('issues.typeOrTitle')}</th><th scope="col">{t('issues.events')}</th><th scope="col">{t('issues.environment')}</th><th scope="col">{t('issues.release')}</th><th scope="col">{t('issues.regression')}</th><th scope="col">{t('issues.lastSeen')}</th><th scope="col"><span className="sr-only">{t('issues.open', { name: t('issues.title') })}</span></th></tr></thead>
            <tbody>{items.map((issue) => {
              const prefetchIssue = () => queryClient.prefetchQuery(issueQueryOptions(issue.id))
              return (
                <tr key={issue.id}>
                  <td data-label={t('issues.status')}><span className={`status-mark status-${issue.status}`} aria-hidden="true" />{t(`issues.${issue.status}` as 'issues.ignored' | 'issues.resolved' | 'issues.unresolved')}</td>
                  <td data-label={t('issues.level')}><span className="severity-label inline-flex rounded-full bg-danger-soft px-2 py-1 text-[11px] font-bold text-[#a52f1d]">{issue.level}</span></td>
                  <td data-label={t('issues.typeOrTitle')} className="issue-title-cell"><span>{issue.exceptionType ?? t('issues.error')}</span><Link className="max-w-lg truncate text-[15px] font-semibold text-ink no-underline hover:underline" href={`/issues/${issue.id}`} onFocus={prefetchIssue} onMouseEnter={prefetchIssue}>{issue.title}</Link></td>
                  <td data-label={t('issues.events')}>{formatCount(issue.eventCount, locale)}</td>
                  <td data-label={t('issues.environment')}>{issue.environment ?? '—'}</td>
                  <td data-label={t('issues.release')}><code>{issue.release ?? '—'}</code></td>
                  <td data-label={t('issues.regression')}>{issue.regressedAt ? <span className="regression-label"><span />{t('issues.yes')}</span> : '—'}</td>
                  <td data-label={t('issues.lastSeen')}>{formatDateTime(issue.lastSeenAt, locale)}</td>
                  <td className="issue-row-action"><Link className="size-8.5 rounded-lg hover:bg-subtle-strong" href={`/issues/${issue.id}`} aria-label={t('issues.open', { name: issue.title })} onFocus={prefetchIssue} onMouseEnter={prefetchIssue}><ViewIcon /></Link></td>
                </tr>
              )
            })}</tbody>
          </table>
          <div className="pagination-bar border-t border-line bg-[#fbfcfd] p-4">
            {previousCursor ? <Link href={pageHref(filters, previousCursor, 'previous')}>{t('issues.previous')}</Link> : <span />}
            <p>{t('issues.showing', { count: items.length })}</p>
            {nextCursor ? <Link href={pageHref(filters, nextCursor, 'next')}>{t('issues.next')} <ViewIcon /></Link> : <span />}
          </div>
        </div>
      )}
    </>
  )
}
