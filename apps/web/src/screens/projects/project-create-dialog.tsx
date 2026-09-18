'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { Input } from 'src/shared/ui/input'
import { Select } from 'src/shared/ui/select'
import { GitHubAppEmptyState } from 'src/screens/projects/github-app-empty-state'
import {
  connectDashboardRepository,
  createDashboardProject,
  deleteDashboardProject,
  githubInstallationsQueryOptions,
  githubRepositoriesQueryOptions,
} from 'src/shared/query/dashboard-query'
import type { ProjectsResponse } from 'src/shared/query/dashboard-types'
import { useI18n } from 'src/shared/i18n/i18n-provider'

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
  const { t } = useI18n()
  const [source, setSource] = useState<ProjectSource>('local')
  const [name, setName] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [rootPath, setRootPath] = useState('')
  const installationsQuery = useQuery({
    ...githubInstallationsQueryOptions(),
    enabled: source === 'github',
  })
  const repositoriesQuery = useQuery({
    ...githubRepositoriesQueryOptions(),
    enabled: source === 'github' && (installationsQuery.data?.items.length ?? 0) > 0,
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
      description={t('projects.createDescription')}
      eyebrow={t('projects.new')}
      icon={<ProjectIcon />}
      title={t('projects.createTitle')}
    >
      <form className="project-dialog-form" onSubmit={submit}>
        <fieldset className="project-source-fieldset">
          <legend>{t('projects.source')}</legend>
          <div className="project-source-options">
            <label className={source === 'local' ? 'project-source-option project-source-option-active' : 'project-source-option'}>
              <input checked={source === 'local'} data-dialog-initial-focus name="project-source" onChange={() => setSource('local')} type="radio" value="local" />
              <span><strong>{t('projects.local')}</strong><small>{t('projects.localDescription')}</small></span>
            </label>
            <label className={source === 'github' ? 'project-source-option project-source-option-active' : 'project-source-option'}>
              <input checked={source === 'github'} name="project-source" onChange={() => setSource('github')} type="radio" value="github" />
              <span><strong>{t('projects.github')}</strong><small>{t('projects.githubDescription')}</small></span>
            </label>
          </div>
        </fieldset>

        {source === 'github' ? installationsQuery.isPending ? (
          <div className="project-dialog-loading" role="status">
            <span className="skeleton-block" />
            <span className="sr-only">{t('projects.loadingInstallations')}</span>
          </div>
        ) : installationsQuery.isError ? (
          <div className="inline-error" role="alert">
            <p>{installationsQuery.error.message}</p>
            <Button onClick={() => installationsQuery.refetch()} type="button" variant="secondary">{t('common.tryAgain')}</Button>
          </div>
        ) : !installationsQuery.data.configured ? (
          <p className="form-error" role="alert">{t('projects.credentialsMissing')}</p>
        ) : installationsQuery.data.items.length === 0 ? <GitHubAppEmptyState /> : repositoriesQuery.isPending ? (
          <div className="project-dialog-loading" role="status">
            <span className="skeleton-block" />
            <span className="sr-only">{t('projects.loadingRepositories')}</span>
          </div>
        ) : repositoriesQuery.isError ? (
          <div className="inline-error" role="alert">
            <p>{repositoriesQuery.error.message}</p>
            <Button onClick={() => repositoriesQuery.refetch()} type="button" variant="secondary">{t('common.tryAgain')}</Button>
          </div>
        ) : (
          <Select
            label={t('projects.repository')}
            name="repository"
            onChange={(event) => {
              const nextRepositoryId = event.target.value
              const repository = repositoriesQuery.data.items.find((item) => item.externalId === nextRepositoryId)
              setRepositoryId(nextRepositoryId)
              if (repository) setName(repository.name)
            }}
            value={repositoryId}
          >
            <option value="">{t('projects.chooseRepository')}</option>
            {repositoriesQuery.data.items.map((repository) => (
              <option disabled={repository.archived} key={repository.externalId} value={repository.externalId}>
                {repository.owner}/{repository.name}{repository.archived ? ` (${t('projects.archived')})` : ''}
              </option>
            ))}
          </Select>
        ) : null}

        <Input
          autoComplete="off"
          label={t('projects.name')}
          maxLength={80}
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder={t('projects.namePlaceholder')}
          required
          value={name}
        />
        {source === 'github' ? <Input
          autoComplete="off"
          hint={t('projects.repositoryRootHint')}
          label={t('projects.repositoryRoot')}
          maxLength={500}
          name="root-path"
          onChange={(event) => setRootPath(event.target.value)}
          placeholder="apps/web"
          value={rootPath}
        /> : null}
        {createMutation.error ? <p className="form-error" role="alert">{createMutation.error.message}</p> : null}
        <div className="ui-dialog-actions">
          <Button disabled={createMutation.isPending} onClick={closeDialog} type="button" variant="secondary">{t('common.cancel')}</Button>
          <Button
            disabled={!name.trim() || (source === 'github' && !repositoryId)}
            pending={createMutation.isPending}
            type="submit"
          >
            {t('projects.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
