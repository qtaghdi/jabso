import { NextResponse } from 'next/server'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { createProjectsResponse, getProjectsResponse } from 'src/shared/query/dashboard-data'
import {
  clearActiveProject,
  createProject,
  deleteProject,
  getActiveProjectFrom,
  listProjects,
  setActiveProjectCookie,
} from 'src/shared/api/projects'

export const GET = async () => {
  await requireWorkspace()
  return NextResponse.json(await getProjectsResponse())
}

export const POST = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  const body = await request.json() as { name?: unknown }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) return NextResponse.json({ error: 'invalid project name' }, { status: 400 })
  const project = await createProject(name)
  await setActiveProjectCookie(project.dsnProjectId)
  return NextResponse.json(await getProjectsResponse(), { status: 201 })
}

export const PATCH = async (request: Request) => {
  await requireWorkspace()
  const body = await request.json() as { projectId?: unknown }
  if (typeof body.projectId !== 'string') return NextResponse.json({ error: 'invalid project' }, { status: 400 })
  const { items } = await listProjects()
  if (!items.some((project) => project.dsnProjectId === body.projectId)) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 })
  }
  await setActiveProjectCookie(body.projectId)
  return NextResponse.json(await createProjectsResponse(items))
}

export const DELETE = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  const body = await request.json() as { projectId?: unknown }
  if (typeof body.projectId !== 'string') return NextResponse.json({ error: 'invalid project' }, { status: 400 })

  const { items } = await listProjects()
  const activeProject = await getActiveProjectFrom(items)
  const target = items.find((project) => project.id === body.projectId)
  if (!target) return NextResponse.json({ error: 'project not found' }, { status: 404 })
  await deleteProject(target.id)

  if (activeProject?.id === target.id) {
    const nextProject = items.find((project) => project.id !== target.id)
    if (nextProject) await setActiveProjectCookie(nextProject.dsnProjectId)
    else await clearActiveProject()
  }

  const remainingItems = items.filter((project) => project.id !== target.id)
  return NextResponse.json(await createProjectsResponse(remainingItems))
}
