import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/auth'
import { getIssuesResponse } from '@/lib/dashboard-data'

export const GET = async (request: Request) => {
  await requireWorkspace()
  return NextResponse.json(await getIssuesResponse(new URL(request.url).searchParams))
}
