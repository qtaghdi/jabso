'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CopyCodeButton } from 'src/shared/ui/copy-code-button'
import { ProjectCreateDialog } from 'src/screens/projects/project-create-dialog'
import { RepositoryConnectionDialog } from 'src/screens/projects/repository-connection-dialog'
import { GitHubInstallationsPanel } from 'src/screens/projects/github-installations-panel'
import { AlertDialog } from 'src/shared/ui/alert-dialog'
import { Button } from 'src/shared/ui/button'
import { Select } from 'src/shared/ui/select'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import {
  dashboardQueryKeys,
  deleteDashboardProject,
  projectsQueryOptions,
  selectDashboardProject,
} from 'src/shared/query/dashboard-query'
import type {
  DashboardProject,
  GitHubInstallationsResponse,
  IssuesResponse,
  ProjectsResponse,
} from 'src/shared/query/dashboard-types'
import { dashboardPageHeaderClass, dashboardSectionHeadingClass, dashboardSurfaceClass } from 'src/shared/ui/dashboard-styles'

type ProjectsViewProps = {
  canManage: boolean
  githubResult?: string
  initialData: ProjectsResponse
  initialGitHubData: GitHubInstallationsResponse
}

const emptyIssuesResponse = (activeProject: DashboardProject | null): IssuesResponse => ({
  activeProject,
  facets: { environments: [], levels: [], releases: [] },
  items: [],
  nextCursor: null,
  previousCursor: null,
})

const ProjectEmptyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M3.5 7.5h17v12h-17zM3.5 7.5l3-3h5l2 3" />
    <path d="M12 11v5M9.5 13.5h5" />
  </svg>
)

export const ProjectsView = ({ canManage, githubResult, initialData, initialGitHubData }: ProjectsViewProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectsQuery = useQuery({ ...projectsQueryOptions(), initialData })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteProject, setDeleteProject] = useState<DashboardProject | null>(null)
  const [repositoryProject, setRepositoryProject] = useState<DashboardProject | null>(null)

  const syncProjects = (data: NonNullable<typeof projectsQuery.data>) => {
    const activeProject = data.items.find((project) => project.active) ?? null
    queryClient.setQueryData(dashboardQueryKeys.projects, data)
    queryClient.removeQueries({ queryKey: ['dashboard', 'issues'] })
    queryClient.removeQueries({ queryKey: ['dashboard', 'issue'] })
    queryClient.setQueryData(dashboardQueryKeys.issues(''), emptyIssuesResponse(activeProject))
    void queryClient.invalidateQueries({
      exact: true,
      queryKey: dashboardQueryKeys.issues(''),
      refetchType: 'none',
    })
  }

  const selectMutation = useMutation({
    mutationFn: selectDashboardProject,
    onSuccess: (data) => {
      syncProjects(data)
      router.push('/')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDashboardProject,
    onSuccess: (data) => {
      syncProjects(data)
      setDeleteProject(null)
    },
  })

  const items = projectsQuery.data?.items ?? []
  const created = (data: ProjectsResponse) => {
    syncProjects(data)
    router.push('/')
  }

  return (
    <>
      <header className={dashboardPageHeaderClass}>
        <h1>{t('projects.title')}</h1>
        <p>{t('projects.description')}</p>
      </header>
      <section className={`${dashboardSurfaceClass} grid grid-cols-[minmax(220px,1fr)_auto] items-center gap-12 px-6 py-5 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:tracking-[-0.015em] [&_p]:mt-2 [&_p]:mb-0 [&_p]:max-w-md [&_p]:text-[13px] [&_p]:text-muted max-[620px]:grid-cols-1 max-[620px]:gap-5 max-[620px]:p-[18px]`} aria-labelledby="create-project-title">
        <div>
          <h2 id="create-project-title">{t('projects.new')}</h2>
          <p>{t('projects.newDescription')}</p>
        </div>
        {canManage ? <Button className="max-[620px]:w-full" onClick={() => setCreateDialogOpen(true)} type="button">
          {t('projects.create')}
        </Button> : null}
      </section>
      <GitHubInstallationsPanel canManage={canManage} connectionResult={githubResult} initialData={initialGitHubData} />
      <section className={`${dashboardSurfaceClass} mt-4 px-6 pt-5 pb-6 max-[620px]:p-[18px]`} aria-labelledby="project-list-title">
        <div className={`${dashboardSectionHeadingClass} mb-4 border-b border-line pb-4 max-[620px]:items-stretch max-[620px]:flex-col`}>
          <div className="project-list-title-group">
            <h2 id="project-list-title">{t('projects.connected')}</h2>
            <span>{t('projects.projectCount', { count: items.length })}</span>
          </div>
          {items.length > 0 ? <Select
            className="project-picker"
            controlSize="sm"
            disabled={selectMutation.isPending || deleteMutation.isPending}
            label={t('projects.activeProject')}
            onChange={(event) => selectMutation.mutate(event.target.value)}
            value={items.find((project) => project.active)?.dsnProjectId ?? ''}
          >
            {items.map((project) => <option key={project.id} value={project.dsnProjectId}>{project.name}</option>)}
          </Select> : null}
        </div>
        {selectMutation.error ? <p className="form-error project-list-error" role="alert">{selectMutation.error.message}</p> : null}
        {projectsQuery.isPending ? (
          <div className="project-list-loading" role="status">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="sr-only">{t('projects.loading')}</span>
          </div>
        ) : projectsQuery.isError ? (
          <div className="inline-error" role="alert">
            <p>{projectsQuery.error.message}</p>
            <Button onClick={() => projectsQuery.refetch()} variant="secondary">{t('common.tryAgain')}</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="grid justify-items-start px-0 pt-10 pb-4">
            <span className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-subtle text-[#3d4651] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]"><ProjectEmptyIcon /></span>
            <strong className="text-sm">{t('projects.empty')}</strong>
            <p className="mt-2 mb-4 max-w-xl text-[13px] leading-relaxed text-muted text-pretty">{t('projects.emptyDescription')}</p>
            {canManage ? <Button onClick={() => setCreateDialogOpen(true)} type="button">{t('projects.create')}</Button> : null}
          </div>
        ) : (
          <div className="project-list gap-3">
            {items.map((project) => {
              return (
                <article className="project-row grid grid-cols-[minmax(180px,.8fr)_minmax(0,1.7fr)_minmax(220px,auto)] items-center gap-7 rounded-xl border border-line bg-white p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-line-strong hover:shadow-md max-[620px]:grid-cols-1 max-[620px]:gap-3.5" key={project.id}>
                  <div className="project-row-heading">
                    <div>
                      <h3>{project.name}</h3>
                      <code>{project.slug}</code>
                      {project.repository ? <a className="project-repository-link" href={project.repository.url} rel="noreferrer" target="_blank">
                        {project.repository.owner}/{project.repository.name}{project.repository.rootPath ? `/${project.repository.rootPath}` : ''}
                      </a> : <span className="project-repository-empty">{t('projects.noRepository')}</span>}
                    </div>
                    {project.active ? <span className="active-project-label">{t('common.active')}</span> : null}
                  </div>
                  <div className="project-dsn rounded-lg border-line bg-subtle">
                    <span><span>DSN</span><code>{project.dsn}</code></span>
                    <CopyCodeButton copiedLabel={t('common.copied')} iconOnly label={t('projects.copyDsn', { name: project.name })} value={project.dsn} />
                  </div>
                  <div className="project-row-actions">
                    <Button
                      className="project-repository-button"
                      disabled={deleteMutation.isPending || selectMutation.isPending}
                      onClick={() => setRepositoryProject(project)}
                      type="button"
                      variant="secondary"
                    >
                      {project.repository ? t('projects.manageGitHub') : t('projects.connectGitHub')}
                    </Button>
                    <Button
                      className="project-delete-button"
                      disabled={deleteMutation.isPending || selectMutation.isPending}
                      onClick={() => {
                        deleteMutation.reset()
                        setDeleteProject(project)
                      }}
                      type="button"
                      variant="ghost"
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
      {createDialogOpen ? <ProjectCreateDialog close={() => setCreateDialogOpen(false)} onCreated={created} /> : null}
      {deleteProject ? <AlertDialog
        cancel={() => {
          if (!deleteMutation.isPending) setDeleteProject(null)
        }}
        cancelLabel={t('common.cancel')}
        closeLabel={t('common.close')}
        confirm={() => deleteMutation.mutate(deleteProject.id)}
        confirmLabel={t('common.delete')}
        description={t('projects.deleteDescription', { name: deleteProject.name })}
        error={deleteMutation.error?.message}
        pending={deleteMutation.isPending}
        title={t('projects.deleteTitle', { name: deleteProject.name })}
      /> : null}
      {repositoryProject ? <RepositoryConnectionDialog close={() => setRepositoryProject(null)} key={repositoryProject.id} project={repositoryProject} /> : null}
    </>
  )
}
