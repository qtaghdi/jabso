import { Suspense } from 'react'
import { IssuesView } from '@/components/issues-view'
import { getIssuesResponse } from '@/lib/dashboard-data'

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

const IssuesPage = async ({ searchParams }: IssuesPageProps) => {
  const initialData = await getIssuesResponse(toUrlSearchParams(await searchParams))
  return (
    <Suspense fallback={<div className="issues-inline-loading" role="status"><span className="skeleton-block skeleton-title" /><span className="sr-only">Loading issues</span></div>}>
      <IssuesView initialData={initialData} />
    </Suspense>
  )
}

export default IssuesPage
