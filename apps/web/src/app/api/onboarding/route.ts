import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { provisionWorkspace, type WorkspaceKind } from 'src/shared/api/workspaces'

const workspaceKinds: WorkspaceKind[] = ['personal', 'team', 'organization']

export const POST = async (request: Request) => {
  const { orgId, userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'authentication required' }, { status: 401 })

  const body = await request.json() as { kind?: unknown; name?: unknown }
  const kind = typeof body.kind === 'string' && workspaceKinds.includes(body.kind as WorkspaceKind)
    ? body.kind as WorkspaceKind
    : null
  if (!kind) return NextResponse.json({ error: 'invalid workspace type' }, { status: 400 })
  if ((kind === 'personal') !== !orgId) {
    return NextResponse.json({ error: 'active Clerk workspace does not match the selected type' }, { status: 409 })
  }

  const user = kind === 'personal' ? await currentUser() : null
  const personalName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || 'Personal workspace'
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
