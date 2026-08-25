import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import {
  clearActiveProject,
  createProject,
  deleteProject,
  getActiveProject,
  listProjects,
  projectDsn,
  setActiveProject,
} from '@/lib/projects'

const projectResponse = async () => {
  const [{ items }, activeProject] = await Promise.all([listProjects(), getActiveProject()])
  return {
    items: items.map((project) => ({
      ...project,
      active: project.dsnProjectId === activeProject?.dsnProjectId,
      dsn: projectDsn(project),
    })),
  }
}

export const GET = async () => {
  await requireOwner()
  return NextResponse.json(await projectResponse())
}

export const POST = async (request: Request) => {
  await requireOwner()
  const body = await request.json() as { name?: unknown }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) return NextResponse.json({ error: 'invalid project name' }, { status: 400 })
  const project = await createProject(name)
  await setActiveProject(project.dsnProjectId)
  return NextResponse.json(await projectResponse(), { status: 201 })
}

export const PATCH = async (request: Request) => {
  await requireOwner()
  const body = await request.json() as { projectId?: unknown }
  if (typeof body.projectId !== 'string') return NextResponse.json({ error: 'invalid project' }, { status: 400 })
  await setActiveProject(body.projectId)
  return NextResponse.json(await projectResponse())
}

export const DELETE = async (request: Request) => {
  await requireOwner()
  const body = await request.json() as { projectId?: unknown }
  if (typeof body.projectId !== 'string') return NextResponse.json({ error: 'invalid project' }, { status: 400 })

  const [{ items }, activeProject] = await Promise.all([listProjects(), getActiveProject()])
  const target = items.find((project) => project.id === body.projectId)
  if (!target) return NextResponse.json({ error: 'project not found' }, { status: 404 })
  await deleteProject(target.id)

  if (activeProject?.id === target.id) {
    const nextProject = items.find((project) => project.id !== target.id)
    if (nextProject) await setActiveProject(nextProject.dsnProjectId)
    else await clearActiveProject()
  }

  const remainingItems = items.filter((project) => project.id !== target.id)
  const nextActiveId = activeProject?.id === target.id ? remainingItems[0]?.id : activeProject?.id
  return NextResponse.json({
    items: remainingItems.map((project) => ({
      ...project,
      active: project.id === nextActiveId,
      dsn: projectDsn(project),
    })),
  })
}
