import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAuth } from 'src/shared/auth/auth'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { deleteWorkspace, renameWorkspace } from 'src/shared/api/workspaces'

export const PATCH = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) {
    return NextResponse.json({ error: 'workspace administrator role required' }, { status: 403 })
  }
  const body = await request.json() as { name?: unknown }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) return NextResponse.json({ error: 'invalid workspace name' }, { status: 400 })

  const externalId = workspace.orgId ? `org:${workspace.orgId}` : `user:${workspace.userId}`
  await renameWorkspace(externalId, name)
  if (!workspace.orgId) return NextResponse.json({ name })

  const requestHeaders = await headers()
  try {
    await getAuth().api.updateOrganization({
      body: { organizationId: workspace.orgId, data: { name } },
      headers: requestHeaders,
    })
  } catch (error) {
    await renameWorkspace(externalId, workspace.name)
    throw error
  }
  return NextResponse.json({ name })
}

export const DELETE = async () => {
  const workspace = await requireWorkspace()
  if (!workspace.orgId || !workspace.canManage) {
    return NextResponse.json({ error: 'organization administrator role required' }, { status: 403 })
  }

  await deleteWorkspace(`org:${workspace.orgId}`)
  return NextResponse.json({ deleted: true })
}
