'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { IssuesResponse } from 'src/shared/query/dashboard-types'

type IssuesPageState = 'onboarding' | 'table'

const storageKey = 'jabso-issues-page-state:v1'

const stateFromResponse = (response: IssuesResponse): IssuesPageState =>
  response.activeProject && response.items.length > 0 ? 'table' : 'onboarding'

export const rememberIssuesPageState = (response: IssuesResponse) => {
  try {
    window.localStorage.setItem(storageKey, stateFromResponse(response))
  } catch {
    // The cached query remains the source of truth when browser storage is unavailable.
  }
}

const readRememberedState = (): IssuesPageState => {
  if (typeof window === 'undefined') return 'onboarding'
  try {
    return window.localStorage.getItem(storageKey) === 'table' ? 'table' : 'onboarding'
  } catch {
    return 'onboarding'
  }
}

const subscribeRememberedState = () => () => undefined

const IssuesTableSkeleton = () => (
  <>
    <div className="issues-skeleton-filters" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => <span className="skeleton-block" key={index} />)}
    </div>
    <div className="issues-skeleton-table" aria-hidden="true">
      <span className="issues-skeleton-table-heading skeleton-block" />
      {Array.from({ length: 4 }, (_, index) => (
        <div className="issues-skeleton-row" key={index}>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      ))}
    </div>
  </>
)

const IssuesOnboardingSkeleton = () => (
  <div className="issues-onboarding-skeleton" aria-hidden="true">
    <div className="issues-onboarding-heading">
      <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
      <span className="skeleton-block" />
    </div>
    <div className="issues-onboarding-workspace">
      <div className="issues-onboarding-steps">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}><span /><div><span className="skeleton-block" /><span className="skeleton-block" /></div></div>
        ))}
      </div>
      <div className="issues-onboarding-focus">
        <div className="issues-onboarding-code">
          <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
          <span className="skeleton-block" />
        </div>
        <div className="issues-onboarding-actions">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </div>
    </div>
  </div>
)

export const IssuesPageSkeleton = () => {
  const queryClient = useQueryClient()
  const cachedResponses = queryClient.getQueriesData<IssuesResponse>({
    queryKey: ['dashboard', 'issues'],
  })
  const cachedResponse = cachedResponses.find(([, response]) => response)?.[1]
  const rememberedState = useSyncExternalStore<IssuesPageState>(
    subscribeRememberedState,
    readRememberedState,
    () => 'onboarding',
  )
  const state = cachedResponse ? stateFromResponse(cachedResponse) : rememberedState

  return (
    <div className="dashboard-page-loading issues-page-loading" role="status">
      <div className="issues-skeleton-header">
        <div><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-copy" /></div>
        <span className="skeleton-block issues-skeleton-project" />
      </div>
      {state === 'table' ? <IssuesTableSkeleton /> : <IssuesOnboardingSkeleton />}
      <span className="sr-only">Loading issues</span>
    </div>
  )
}
