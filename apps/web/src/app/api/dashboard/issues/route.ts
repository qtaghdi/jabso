import { NextResponse } from 'next/server'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { getIssuesResponse } from 'src/shared/query/dashboard-data'

export const GET = async (request: Request) => {
  await requireWorkspace()
  return NextResponse.json(await getIssuesResponse(new URL(request.url).searchParams))
}
