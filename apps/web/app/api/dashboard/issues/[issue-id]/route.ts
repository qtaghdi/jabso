import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/auth'
import { getIssue, updateIssueStatus, type IssueSummary } from '@/lib/jabso-api'

type IssueRouteProps = { params: Promise<{ 'issue-id': string }> }

const statuses = new Set<IssueSummary['status']>(['unresolved', 'resolved', 'ignored'])

export const GET = async (_request: Request, { params }: IssueRouteProps) => {
  await requireWorkspace()
  const { 'issue-id': issueId } = await params
  const issue = await getIssue(issueId)
  return issue
    ? NextResponse.json(issue)
    : NextResponse.json({ error: 'issue not found' }, { status: 404 })
}

export const PATCH = async (request: Request, { params }: IssueRouteProps) => {
  await requireWorkspace()
  const { 'issue-id': issueId } = await params
  const body = await request.json() as { status?: unknown }
  if (typeof body.status !== 'string' || !statuses.has(body.status as IssueSummary['status'])) {
    return NextResponse.json({ error: 'invalid issue status' }, { status: 400 })
  }
  const result = await updateIssueStatus(issueId, body.status as IssueSummary['status'])
  if (!result) return NextResponse.json({ error: 'issue not found' }, { status: 404 })
  const issue = await getIssue(issueId)
  return NextResponse.json(issue)
}
