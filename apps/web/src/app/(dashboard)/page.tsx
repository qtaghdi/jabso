import { Suspense } from 'react'
import { IssuesView } from 'src/features/issues/components/issues-view'
import { getIssuesResponse } from 'src/lib/dashboard/dashboard-data'

type IssuesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const toUrlSearchParams = (input: Record<string, string | string[] | undefined>) => {
  const parameters = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') parameters.set(key, value)
    else if (value?.[0]) parameters.set(key, value[0])
  }
  return parameters
}

const IssuesPageData = async ({ searchParams }: IssuesPageProps) => {
  const initialData = await getIssuesResponse(toUrlSearchParams(await searchParams))
  return <IssuesView initialData={initialData} />
}

const IssuesPageLoading = () => (
  <div className="dashboard-page-loading issues-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <div className="skeleton-table">
      {Array.from({ length: 4 }, (_, index) => <span className="skeleton-block" key={index} />)}
    </div>
    <span className="sr-only">Loading issues</span>
  </div>
)

const IssuesPage = ({ searchParams }: IssuesPageProps) => (
  <Suspense fallback={<IssuesPageLoading />}>
    <IssuesPageData searchParams={searchParams} />
  </Suspense>
)

export default IssuesPage
