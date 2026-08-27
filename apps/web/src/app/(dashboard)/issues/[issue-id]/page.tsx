import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { IssueDetailView } from 'src/screens/issues/issue-detail-view'
import { getIssue } from 'src/shared/api/issues'

type IssuePageProps = {
  params: Promise<{ 'issue-id': string }>
}

const IssuePageData = async ({ params }: IssuePageProps) => {
  const issueId = (await params)['issue-id']
  const issue = await getIssue(issueId)
  if (!issue) notFound()
  return <IssueDetailView initialData={issue} issueId={issueId} />
}

const IssuePage = ({ params }: IssuePageProps) => (
  <Suspense fallback={<div className="dashboard-page-loading issue-detail-page-loading" role="status"><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-copy" /><span className="skeleton-block skeleton-code" /><span className="sr-only">Loading issue</span></div>}>
    <IssuePageData params={params} />
  </Suspense>
)

export default IssuePage
