import 'server-only'

import { getServerApiConfig } from '@/lib/server-api-config'

export type WorkspaceKind = 'personal' | 'team' | 'organization'

export type Workspace = {
  externalId: string
  id: string
  kind: WorkspaceKind
  name: string
}

const workspaceRequest = async <Result>(path: string, init?: RequestInit): Promise<Result | null> => {
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  const response = await fetch(`${baseUrl}${path}`, { ...init, cache: 'no-store', headers })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Jabso workspace request failed with status ${response.status}`)
  return response.json() as Promise<Result>
}

export const findWorkspace = (externalId: string) =>
  workspaceRequest<Workspace>(`/api/workspaces/${encodeURIComponent(externalId)}`)

export const provisionWorkspace = (input: { externalId: string; kind: WorkspaceKind; name: string }) =>
  workspaceRequest<Workspace>('/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((workspace) => {
    if (!workspace) throw new Error('Workspace provisioning returned no workspace')
    return workspace
  })
