import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'
import { requireOwner } from '@/lib/auth'

export type ProjectSummary = {
  createdAt: string
  dsnProjectId: string
  id: string
  name: string
  publicKey: string
  slug: string
}

type ProjectList = {
  items: ProjectSummary[]
  nextCursor: string | null
}

const activeProjectCookie = 'jabso-active-project'

export const getServerApiConfig = () => {
  const config = {
    baseUrl: process.env.JABSO_API_URL?.trim() || 'http://localhost:4000',
    dashboardToken: process.env.JABSO_DASHBOARD_TOKEN?.trim() || 'replace-with-a-long-random-token',
  }
  const missingProductionVariables = process.env.VERCEL === '1'
    ? [
        !process.env.JABSO_API_URL?.trim() && 'JABSO_API_URL',
        !process.env.JABSO_DASHBOARD_TOKEN?.trim() && 'JABSO_DASHBOARD_TOKEN',
      ].filter(Boolean)
    : []
  if (missingProductionVariables.length > 0) {
    throw new Error(`Jabso web configuration is missing: ${missingProductionVariables.join(', ')}`)
  }
  return { ...config, baseUrl: config.baseUrl.replace(/\/$/, '') }
}

const dashboardRequest = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  await requireOwner()
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  const response = await fetch(`${baseUrl}${path}`, { cache: 'no-store', ...init, headers })
  if (!response.ok) throw new Error(`Jabso API request failed with status ${response.status}`)
  return response.json() as Promise<Result>
}

export const listProjects = cache(async () =>
  dashboardRequest<ProjectList>('/api/projects?limit=100'),
)

export const createProject = async (name: string) =>
  dashboardRequest<ProjectSummary>('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })

export const deleteProject = async (id: string) =>
  dashboardRequest<{ deleted: boolean; id: string }>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

export const getActiveProject = cache(async () => {
  const { items } = await listProjects()
  const selectedId = (await cookies()).get(activeProjectCookie)?.value
  const configuredId = process.env.JABSO_PROJECT_ID?.trim()
  return items.find((project) => project.dsnProjectId === selectedId)
    ?? items.find((project) => project.dsnProjectId === configuredId)
    ?? items[0]
    ?? null
})

export const setActiveProject = async (dsnProjectId: string) => {
  const projects = await listProjects()
  if (!projects.items.some((project) => project.dsnProjectId === dsnProjectId)) {
    throw new Error('Cannot activate an unknown Jabso project')
  }
  const cookieStore = await cookies()
  cookieStore.set(activeProjectCookie, dsnProjectId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
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
