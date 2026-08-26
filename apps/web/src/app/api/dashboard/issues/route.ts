import { NextResponse } from 'next/server'
import { requireWorkspace } from 'src/lib/auth/workspace-auth'
import { getIssuesResponse } from 'src/lib/dashboard/dashboard-data'

export const GET = async (request: Request) => {
  await requireWorkspace()
  return NextResponse.json(await getIssuesResponse(new URL(request.url).searchParams))
}
