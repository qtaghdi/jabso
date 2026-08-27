import 'server-only'

import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { cache } from 'react'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { getServerApiConfig } from 'src/shared/api/server-api-config'

export type ProjectSummary = {
  createdAt: string
  dsnProjectId: string
  id: string
  name: string
  publicKey: string
  slug: string
  repository: RepositoryConnection | null
}

export type RepositoryConnection = {
  connectedAt: string
  defaultBranch: string
  externalId: string
  name: string
  owner: string
  private: boolean
  rootPath: string
  url: string
}

type ProjectList = {
  items: ProjectSummary[]
  nextCursor: string | null
}

const activeProjectCookie = 'jabso-active-project'
const projectsCacheTag = 'jabso-dashboard-projects'

type DashboardRequestOptions = {
  cache?: { revalidate: number; tags: string[] }
  operation: string
}

const dashboardRequest = async <Result>(
  path: string,
  init: RequestInit | undefined,
  options: DashboardRequestOptions,
): Promise<Result> => {
  const workspace = await requireWorkspace()
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  headers.set('x-jabso-workspace-id', workspace.id)
  const startedAt = performance.now()
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    ...(options.cache ? { next: options.cache } : { cache: 'no-store' }),
  })
  console.info('[jabso-dashboard-upstream]', {
    durationMs: Math.round(performance.now() - startedAt),
    operation: options.operation,
    status: response.status,
  })
  if (!response.ok) throw new Error(`Jabso API request failed with status ${response.status}`)
  return response.json() as Promise<Result>
}

export const listProjects = cache(async () =>
  dashboardRequest<ProjectList>('/api/projects?limit=100', undefined, {
    cache: { revalidate: 300, tags: [projectsCacheTag] },
    operation: 'projects.list',
  }),
)

export const createProject = async (name: string) =>
  dashboardRequest<ProjectSummary>('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  }, { operation: 'projects.create' }).then((project) => {
    revalidateTag(projectsCacheTag, { expire: 0 })
    return project
  })

export const deleteProject = async (id: string) =>
  dashboardRequest<{ deleted: boolean; id: string }>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, { operation: 'projects.delete' }).then((result) => {
    revalidateTag(projectsCacheTag, { expire: 0 })
    return result
  })

export const setProjectRepository = async (projectId: string, repository: Omit<RepositoryConnection, 'connectedAt'>) =>
  dashboardRequest<{ projectId: string; repository: RepositoryConnection }>(
    `/api/projects/${encodeURIComponent(projectId)}/repository`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(repository),
    },
    { operation: 'projects.repository.connect' },
  ).then((result) => {
    revalidateTag(projectsCacheTag, { expire: 0 })
    return result
  })

export const disconnectProjectRepository = async (projectId: string) =>
  dashboardRequest<{ disconnected: boolean; projectId: string }>(
    `/api/projects/${encodeURIComponent(projectId)}/repository`,
    { method: 'DELETE' },
    { operation: 'projects.repository.disconnect' },
  ).then((result) => {
    revalidateTag(projectsCacheTag, { expire: 0 })
    return result
  })

export const getActiveProjectFrom = async (items: ProjectSummary[]) => {
  const selectedId = (await cookies()).get(activeProjectCookie)?.value
  const configuredId = process.env.JABSO_PROJECT_ID?.trim()
  return items.find((project) => project.dsnProjectId === selectedId)
    ?? items.find((project) => project.dsnProjectId === configuredId)
    ?? items[0]
    ?? null
}

export const getActiveProject = cache(async () =>
  getActiveProjectFrom((await listProjects()).items),
)

export const setActiveProjectCookie = async (dsnProjectId: string) => {
  const cookieStore = await cookies()
  cookieStore.set(activeProjectCookie, dsnProjectId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export const setActiveProject = async (dsnProjectId: string) => {
  const projects = await listProjects()
  if (!projects.items.some((project) => project.dsnProjectId === dsnProjectId)) {
    throw new Error('Cannot activate an unknown Jabso project')
  }
  await setActiveProjectCookie(dsnProjectId)
}

export const clearActiveProject = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(activeProjectCookie)
}

export const projectDsn = (project: ProjectSummary) => {
  const { baseUrl } = getServerApiConfig()
  const dsn = new URL(baseUrl)
  dsn.username = project.publicKey
  dsn.pathname = `/${project.dsnProjectId}`
  dsn.search = ''
  dsn.hash = ''
  return dsn.toString().replace(/\/$/, '')
}
