import { NextResponse } from 'next/server'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import {
  createMcpConnection,
  listMcpConnections,
} from 'src/shared/api/mcp'

export const GET = async () => {
  await requireWorkspace()
  return NextResponse.json(await listMcpConnections())
}

export const POST = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  const body = await request.json() as { name?: unknown; projectIds?: unknown }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const projectIds = Array.isArray(body.projectIds)
    ? body.projectIds.filter((value): value is string => typeof value === 'string')
    : []
  if (!name || name.length > 80 || projectIds.length === 0 || projectIds.length > 100) {
    return NextResponse.json({ error: 'Name the connection and choose at least one project.' }, { status: 400 })
  }
  return NextResponse.json(await createMcpConnection({ name, projectIds }), { status: 201 })
}
