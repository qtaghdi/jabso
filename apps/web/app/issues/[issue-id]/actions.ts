'use server'

import { revalidatePath } from 'next/cache'
import { updateIssueStatus, type IssueSummary } from '@/lib/jabso-api'
import { requireOwner } from '@/lib/auth'

const statuses = new Set<IssueSummary['status']>(['unresolved', 'resolved', 'ignored'])

export const changeIssueStatus = async (formData: FormData) => {
  await requireOwner()
  const issueId = formData.get('issue-id')
  const status = formData.get('status')
  if (typeof issueId !== 'string' || typeof status !== 'string' || !statuses.has(status as IssueSummary['status'])) {
    throw new Error('Invalid issue status request')
  }
  const result = await updateIssueStatus(issueId, status as IssueSummary['status'])
  if (!result) throw new Error('Issue not found')
  revalidatePath('/')
  revalidatePath(`/issues/${issueId}`)
}
