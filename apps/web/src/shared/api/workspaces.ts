import 'server-only'

import { revalidateTag } from 'next/cache'
import { getServerApiConfig } from 'src/shared/api/server-api-config'

export type WorkspaceKind = 'personal' | 'team' | 'organization'

export type Workspace = {
  externalId: string
  id: string
  kind: WorkspaceKind
  name: string
}

const workspaceCacheTag = (externalId: string) => `jabso-workspace:${externalId}`

const workspaceRequest = async <Result>(
  path: string,
  init?: RequestInit,
  cache?: { revalidate: number; tags: string[] },
): Promise<Result | null> => {
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    ...(cache ? { next: cache } : { cache: 'no-store' }),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Jabso workspace request failed with status ${response.status}`)
  return response.json() as Promise<Result>
}

export const findWorkspace = (externalId: string) =>
  workspaceRequest<Workspace>(`/api/workspaces/${encodeURIComponent(externalId)}`, undefined, {
    revalidate: 60,
    tags: [workspaceCacheTag(externalId)],
  })

export const provisionWorkspace = (input: { externalId: string; kind: WorkspaceKind; name: string }) =>
  workspaceRequest<Workspace>('/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((workspace) => {
    if (!workspace) throw new Error('Workspace provisioning returned no workspace')
    revalidateTag(workspaceCacheTag(input.externalId), { expire: 0 })
    return workspace
  })

export const renameWorkspace = (externalId: string, name: string) =>
  workspaceRequest<Workspace>(`/api/workspaces/${encodeURIComponent(externalId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((workspace) => {
    if (!workspace) throw new Error('Workspace not found')
    revalidateTag(workspaceCacheTag(externalId), { expire: 0 })
    return workspace
  })

export const deleteWorkspace = (externalId: string) =>
  workspaceRequest<{ deleted: true; id: string }>(`/api/workspaces/${encodeURIComponent(externalId)}`, {
    method: 'DELETE',
  }).then((result) => {
    revalidateTag(workspaceCacheTag(externalId), { expire: 0 })
    return result
  })
