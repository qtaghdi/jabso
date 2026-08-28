import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { IssueDetailSkeleton } from 'src/screens/issues/issue-detail-skeleton'
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
  <Suspense fallback={<IssueDetailSkeleton />}>
    <IssuePageData params={params} />
  </Suspense>
)

export default IssuePage
