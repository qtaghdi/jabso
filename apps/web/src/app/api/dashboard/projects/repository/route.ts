import { NextResponse } from 'next/server'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { listGitHubRepositories } from 'src/shared/integrations/github'
import { disconnectProjectRepository, listProjects, setProjectRepository } from 'src/shared/api/projects'

const normalizeRootPath = (value: unknown) => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/^\/+|\/+$/g, '')
  const segments = normalized ? normalized.split('/') : []
  if (normalized.length > 500 || normalized.includes('\\') || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null
  }
  return normalized
}

export const PUT = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  const body = await request.json() as { projectId?: unknown; repositoryId?: unknown; rootPath?: unknown }
  const rootPath = normalizeRootPath(body.rootPath)
  if (typeof body.projectId !== 'string' || typeof body.repositoryId !== 'string' || rootPath === null) {
    return NextResponse.json({ error: 'Choose a repository and enter a valid repository root.' }, { status: 400 })
  }
  const [{ items: projects }, repositories] = await Promise.all([listProjects(), listGitHubRepositories()])
  if (!projects.some((project) => project.id === body.projectId)) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  }
  const repository = repositories.find((item) => item.externalId === body.repositoryId)
  if (!repository || repository.archived) {
    return NextResponse.json({ error: 'The GitHub repository is unavailable or archived.' }, { status: 400 })
  }
  return NextResponse.json(await setProjectRepository(body.projectId, {
    defaultBranch: repository.defaultBranch,
    externalId: repository.externalId,
    name: repository.name,
    owner: repository.owner,
    private: repository.private,
    rootPath,
    url: repository.url,
  }))
}

export const DELETE = async (request: Request) => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  const body = await request.json() as { projectId?: unknown }
  if (typeof body.projectId !== 'string') {
    return NextResponse.json({ error: 'Project not found.' }, { status: 400 })
  }
  return NextResponse.json(await disconnectProjectRepository(body.projectId))
}
