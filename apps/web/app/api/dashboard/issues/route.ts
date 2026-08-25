import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getIssuesResponse } from '@/lib/dashboard-data'

export const GET = async (request: Request) => {
  await requireOwner()
  return NextResponse.json(await getIssuesResponse(new URL(request.url).searchParams))
}
