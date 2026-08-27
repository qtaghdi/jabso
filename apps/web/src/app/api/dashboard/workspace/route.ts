import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
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

  const client = await clerkClient()
  await renameWorkspace(`org:${workspace.orgId}`, name)
  try {
    await client.organizations.updateOrganization(workspace.orgId, { name })
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

  const client = await clerkClient()
  await deleteWorkspace(`org:${workspace.orgId}`)
  await client.organizations.deleteOrganization(workspace.orgId)
  return NextResponse.json({ deleted: true })
}
