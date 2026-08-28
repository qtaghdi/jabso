import { Suspense } from 'react'
import { IssuesPageSkeleton } from 'src/screens/issues/issues-page-skeleton'
import { IssuesView } from 'src/screens/issues/issues-view'
import { getIssuesResponse } from 'src/shared/query/dashboard-data'

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

const IssuesPage = ({ searchParams }: IssuesPageProps) => (
  <Suspense fallback={<IssuesPageSkeleton />}>
    <IssuesPageData searchParams={searchParams} />
  </Suspense>
)

export default IssuesPage
