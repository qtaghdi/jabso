import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAuth } from 'src/shared/auth/auth'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { deleteWorkspace, renameWorkspace } from 'src/shared/api/workspaces'

export const PATCH = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.orgId || !workspace.canManage) {
    return NextResponse.json({ error: 'organization administrator role required' }, { status: 403 })
  }
  const body = await request.json() as { name?: unknown }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) return NextResponse.json({ error: 'invalid workspace name' }, { status: 400 })

  const requestHeaders = await headers()
  await renameWorkspace(`org:${workspace.orgId}`, name)
  try {
    await getAuth().api.updateOrganization({
      body: { organizationId: workspace.orgId, data: { name } },
      headers: requestHeaders,
    })
  } catch (error) {
    await renameWorkspace(`org:${workspace.orgId}`, workspace.name)
    throw error
  }
  return NextResponse.json({ name })
}

export const DELETE = async () => {
  const workspace = await requireWorkspace()
  if (!workspace.orgId || !workspace.canManage) {
    return NextResponse.json({ error: 'organization administrator role required' }, { status: 403 })
  }

  const requestHeaders = await headers()
  await deleteWorkspace(`org:${workspace.orgId}`)
  await getAuth().api.deleteOrganization({
    body: { organizationId: workspace.orgId },
    headers: requestHeaders,
  })
  return NextResponse.json({ deleted: true })
}
