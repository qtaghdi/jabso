'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from 'src/components/ui/button'
import { Dialog } from 'src/components/ui/dialog'
import { Input } from 'src/components/ui/input'
import { Select } from 'src/components/ui/select'
import {
  connectDashboardRepository,
  createDashboardProject,
  deleteDashboardProject,
  githubRepositoriesQueryOptions,
} from 'src/lib/dashboard/dashboard-query'
import type { ProjectsResponse } from 'src/lib/dashboard/dashboard-types'

type ProjectSource = 'github' | 'local'

type ProjectCreateDialogProps = {
  close: () => void
  onCreated: (data: ProjectsResponse) => void
}

const ProjectIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 7.5h6l1.7 2H20v9.5H4V7.5Z" />
    <path d="M4 7.5V5h6l1.7 2H20v2.5" />
  </svg>
)

export const ProjectCreateDialog = ({ close, onCreated }: ProjectCreateDialogProps) => {
  const [source, setSource] = useState<ProjectSource>('local')
  const [name, setName] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [rootPath, setRootPath] = useState('')
  const repositoriesQuery = useQuery({
    ...githubRepositoriesQueryOptions(),
    enabled: source === 'github',
  })
  const createMutation = useMutation({
    mutationFn: async () => {
      const projects = await createDashboardProject(name.trim())
      if (source === 'local') return projects

      const project = projects.items.find((item) => item.active)
      if (!project) throw new Error('Jabso created the project but could not select it.')
      try {
        const result = await connectDashboardRepository({ projectId: project.id, repositoryId, rootPath })
        return {
          items: projects.items.map((item) => item.id === project.id
            ? { ...item, repository: result.repository }
            : item),
        }
      } catch (error) {
        await deleteDashboardProject(project.id).catch(() => undefined)
        throw error
      }
    },
    onSuccess: (data) => {
      onCreated(data)
      close()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim() && (source === 'local' || repositoryId)) createMutation.mutate()
  }
  const closeDialog = () => {
    if (!createMutation.isPending) close()
  }

  return (
    <Dialog
      close={closeDialog}
      description="Start with a standalone project or connect one public GitHub repository during setup."
      eyebrow="New project"
      icon={<ProjectIcon />}
      title="Create an issue inbox"
    >
      <form className="project-dialog-form" onSubmit={submit}>
        <fieldset className="project-source-fieldset">
          <legend>Project source</legend>
          <div className="project-source-options">
            <label className={source === 'local' ? 'project-source-option project-source-option-active' : 'project-source-option'}>
              <input checked={source === 'local'} data-dialog-initial-focus name="project-source" onChange={() => setSource('local')} type="radio" value="local" />
              <span><strong>Local project</strong><small>Create a DSN without linking a repository.</small></span>
            </label>
            <label className={source === 'github' ? 'project-source-option project-source-option-active' : 'project-source-option'}>
              <input checked={source === 'github'} name="project-source" onChange={() => setSource('github')} type="radio" value="github" />
              <span><strong>GitHub project</strong><small>Connect a public personal or organization repository.</small></span>
            </label>
          </div>
        </fieldset>

        {source === 'github' ? repositoriesQuery.isPending ? (
          <div className="project-dialog-loading" role="status">
            <span className="skeleton-block" />
            <span className="sr-only">Loading GitHub repositories</span>
          </div>
        ) : repositoriesQuery.isError ? (
          <div className="inline-error" role="alert">
            <p>{repositoriesQuery.error.message}</p>
            <Button onClick={() => repositoriesQuery.refetch()} type="button" variant="secondary">Try again</Button>
          </div>
        ) : (
          <Select
            label="GitHub repository"
            name="repository"
            onChange={(event) => {
              const nextRepositoryId = event.target.value
              const repository = repositoriesQuery.data.items.find((item) => item.externalId === nextRepositoryId)
              setRepositoryId(nextRepositoryId)
              if (repository) setName(repository.name)
            }}
            value={repositoryId}
          >
            <option value="">Choose a repository</option>
            {repositoriesQuery.data.items.map((repository) => (
              <option disabled={repository.archived} key={repository.externalId} value={repository.externalId}>
                {repository.owner}/{repository.name}{repository.archived ? ' (archived)' : ''}
              </option>
            ))}
          </Select>
        ) : null}

        <Input
          autoComplete="off"
          label="Project name"
          maxLength={80}
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Checkout web"
          required
          value={name}
        />
        {source === 'github' ? <Input
          autoComplete="off"
          hint="Optional. Use a relative path when the app lives inside a monorepo."
          label="Repository root"
          maxLength={500}
          name="root-path"
          onChange={(event) => setRootPath(event.target.value)}
          placeholder="apps/web"
          value={rootPath}
        /> : null}
        {createMutation.error ? <p className="form-error" role="alert">{createMutation.error.message}</p> : null}
        <div className="ui-dialog-actions">
          <Button disabled={createMutation.isPending} onClick={closeDialog} type="button" variant="secondary">Cancel</Button>
          <Button
            disabled={!name.trim() || (source === 'github' && !repositoryId)}
            pending={createMutation.isPending}
            type="submit"
          >
            Create project
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
