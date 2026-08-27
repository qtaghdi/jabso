'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { Input } from 'src/shared/ui/input'
import { Select } from 'src/shared/ui/select'
import {
  connectDashboardRepository,
  dashboardQueryKeys,
  disconnectDashboardRepository,
  githubRepositoriesQueryOptions,
} from 'src/shared/query/dashboard-query'
import type { DashboardProject, ProjectsResponse } from 'src/shared/query/dashboard-types'

type RepositoryConnectionDialogProps = {
  close: () => void
  project: DashboardProject
}

const GitHubIcon = () => (
  <svg aria-hidden="true" className="github-icon" viewBox="0 0 24 24">
    <path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9v-2.4c-2.3.5-2.8-1-2.8-1-.4-1-.9-1.3-.9-1.3-.8-.5 0-.5 0-.5.8.1 1.3.8 1.3.8.7 1.3 1.8.9 2.3.7.1-.5.3-.9.6-1.1-1.9-.2-3.8-.9-3.8-4.1 0-.9.3-1.7.8-2.3-.1-.2-.4-1.1.1-2.3 0 0 .7-.2 2.5.9a8.5 8.5 0 0 1 4.5 0c1.8-1.2 2.5-.9 2.5-.9.5 1.2.2 2.1.1 2.3.5.6.8 1.4.8 2.3 0 3.2-1.9 3.9-3.8 4.1.3.3.6.8.6 1.6v2.4A9.2 9.2 0 0 0 12 2.8Z" />
  </svg>
)

export const RepositoryConnectionDialog = ({ close, project }: RepositoryConnectionDialogProps) => {
  const queryClient = useQueryClient()
  const repositoriesQuery = useQuery(githubRepositoriesQueryOptions())
  const [repositoryId, setRepositoryId] = useState(project.repository?.externalId ?? '')
  const [rootPath, setRootPath] = useState(project.repository?.rootPath ?? '')

  const updateProject = (repository: DashboardProject['repository']) => {
    queryClient.setQueryData<ProjectsResponse>(dashboardQueryKeys.projects, (current) => current
      ? { items: current.items.map((item) => item.id === project.id ? { ...item, repository } : item) }
      : current)
  }
  const connectMutation = useMutation({
    mutationFn: connectDashboardRepository,
    onSuccess: (result) => {
      updateProject(result.repository)
      close()
    },
  })
  const disconnectMutation = useMutation({
    mutationFn: disconnectDashboardRepository,
    onSuccess: () => {
      updateProject(null)
      close()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (repositoryId) connectMutation.mutate({ projectId: project.id, repositoryId, rootPath })
  }
  const mutationError = connectMutation.error ?? disconnectMutation.error
  const closeDialog = () => {
    if (!connectMutation.isPending && !disconnectMutation.isPending) close()
  }

  return (
    <Dialog
      close={closeDialog}
      description="Choose a public repository owned by you, shared with you, or available through your GitHub organizations."
      eyebrow="Repository connection"
      icon={<GitHubIcon />}
      title={`Connect ${project.name}`}
    >
      {repositoriesQuery.isPending ? <div className="repository-dialog-loading" role="status"><span className="skeleton-block" /><span className="sr-only">Loading GitHub repositories</span></div> : repositoriesQuery.isError ? (
        <div className="inline-error" role="alert"><p>{repositoriesQuery.error.message}</p><Button onClick={() => repositoriesQuery.refetch()} variant="secondary">Try again</Button></div>
      ) : <form className="repository-connection-form" onSubmit={submit}>
        <Select label="GitHub repository" name="repository" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)}>
          <option value="">Choose a repository</option>
          {repositoriesQuery.data.items.map((repository) => (
            <option disabled={repository.archived} key={repository.externalId} value={repository.externalId}>
              {repository.owner}/{repository.name}{repository.archived ? ' (archived)' : ''}
            </option>
          ))}
        </Select>
        <Input
          autoComplete="off"
          hint="Optional. Use a relative path without a leading slash."
          label="Repository root"
          maxLength={500}
          name="root-path"
          onChange={(event) => setRootPath(event.target.value)}
          placeholder="apps/web"
          value={rootPath}
        />
        {mutationError ? <p className="form-error" role="alert">{mutationError.message}</p> : null}
        <div className="repository-dialog-actions">
          {project.repository ? <Button disabled={connectMutation.isPending} onClick={() => disconnectMutation.mutate(project.id)} pending={disconnectMutation.isPending} type="button" variant="ghost">
            Disconnect
          </Button> : <span />}
          <Button disabled={!repositoryId || disconnectMutation.isPending} pending={connectMutation.isPending} type="submit">
            {project.repository ? 'Update connection' : 'Connect repository'}
          </Button>
        </div>
      </form>}
    </Dialog>
  )
}
