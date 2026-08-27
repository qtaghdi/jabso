import { NextResponse } from 'next/server'
import { requireWorkspace } from 'src/lib/auth/workspace-auth'
import { revokeMcpConnection } from 'src/lib/jabso/mcp'

type ConnectionRouteProps = { params: Promise<{ 'connection-id': string }> }

export const DELETE = async (_request: Request, { params }: ConnectionRouteProps) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  const { 'connection-id': connectionId } = await params
  return NextResponse.json(await revokeMcpConnection(connectionId))
}
