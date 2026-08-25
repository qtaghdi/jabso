import { notFound } from 'next/navigation'
import { IssueDetailView } from '@/components/issue-detail-view'
import { getIssue } from '@/lib/jabso-api'

type IssuePageProps = {
  params: Promise<{ 'issue-id': string }>
}

const IssuePage = async ({ params }: IssuePageProps) => {
  const issueId = (await params)['issue-id']
  const issue = await getIssue(issueId)
  if (!issue) notFound()
  return <IssueDetailView initialData={issue} issueId={issueId} />
}

export default IssuePage
