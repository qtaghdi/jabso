import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { provisionWorkspace, type WorkspaceKind } from 'src/shared/api/workspaces'
import { auth } from 'src/shared/auth/auth'

const workspaceKinds: WorkspaceKind[] = ['personal', 'team', 'organization']

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'authentication required' }, { status: 401 })
  const userId = session.user.id
  const orgId = session.session.activeOrganizationId ?? null

  const body = await request.json() as { kind?: unknown; name?: unknown }
  const kind = typeof body.kind === 'string' && workspaceKinds.includes(body.kind as WorkspaceKind)
    ? body.kind as WorkspaceKind
    : null
  if (!kind) return NextResponse.json({ error: 'invalid workspace type' }, { status: 400 })
  if ((kind === 'personal') !== !orgId) {
    return NextResponse.json({ error: 'active workspace does not match the selected type' }, { status: 409 })
  }

  const personalName = session.user.name || session.user.email || 'Personal workspace'
  const requestedName = typeof body.name === 'string' ? body.name.trim() : ''
  const name = kind === 'personal' ? personalName : requestedName
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'workspace name must be between 1 and 80 characters' }, { status: 400 })
  }

  const workspace = await provisionWorkspace({
    externalId: orgId ? `org:${orgId}` : `user:${userId}`,
    kind,
    name,
  })
  return NextResponse.json({ workspace }, { status: 201 })
}
