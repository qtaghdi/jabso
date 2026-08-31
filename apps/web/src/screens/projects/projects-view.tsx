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

export const ProjectsView = ({ canManage, githubResult, initialData, initialGitHubData }: ProjectsViewProps) => {
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
      <header className="page-header compact-page-header">
        <h1>Projects</h1>
        <p>Create an isolated issue inbox and DSN for each application.</p>
      </header>
      <section className="project-create-section" aria-labelledby="create-project-title">
        <div>
          <h2 id="create-project-title">New project</h2>
          <p>Create a standalone DSN or connect a repository selected for this workspace.</p>
        </div>
        <Button className="project-create-button" onClick={() => setCreateDialogOpen(true)} type="button">
          Create project
        </Button>
      </section>
      <GitHubInstallationsPanel canManage={canManage} connectionResult={githubResult} initialData={initialGitHubData} />
      <section className="project-list-section" aria-labelledby="project-list-title">
        <div className="section-heading-row">
          <div className="project-list-title-group">
            <h2 id="project-list-title">Connected projects</h2>
            <span>{items.length} {items.length === 1 ? 'project' : 'projects'}</span>
          </div>
          {items.length > 0 ? <Select
            className="project-picker"
            controlSize="sm"
            disabled={selectMutation.isPending || deleteMutation.isPending}
            label="Active project"
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
            <span className="sr-only">Loading projects</span>
          </div>
        ) : projectsQuery.isError ? (
          <div className="inline-error" role="alert">
            <p>{projectsQuery.error.message}</p>
            <Button onClick={() => projectsQuery.refetch()} variant="secondary">Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <p className="muted-copy">No projects are connected yet.</p>
        ) : (
          <div className="project-list">
            {items.map((project) => {
              return (
                <article className="project-row" key={project.id}>
                  <div className="project-row-heading">
                    <div>
                      <h3>{project.name}</h3>
                      <code>{project.slug}</code>
                      {project.repository ? <a className="project-repository-link" href={project.repository.url} rel="noreferrer" target="_blank">
                        {project.repository.owner}/{project.repository.name}{project.repository.rootPath ? `/${project.repository.rootPath}` : ''}
                      </a> : <span className="project-repository-empty">No repository connected</span>}
                    </div>
                    {project.active ? <span className="active-project-label">Active</span> : null}
                  </div>
                  <div className="project-dsn">
                    <span><span>DSN</span><code>{project.dsn}</code></span>
                    <CopyCodeButton iconOnly label={`Copy ${project.name} DSN`} value={project.dsn} />
                  </div>
                  <div className="project-row-actions">
                    <Button
                      className="project-repository-button"
                      disabled={deleteMutation.isPending || selectMutation.isPending}
                      onClick={() => setRepositoryProject(project)}
                      type="button"
                      variant="secondary"
                    >
                      {project.repository ? 'Manage GitHub' : 'Connect GitHub'}
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
                      Delete
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
        confirm={() => deleteMutation.mutate(deleteProject.id)}
        description={`New events for ${deleteProject.name} will be rejected. Existing issue data is retained for recovery.`}
        error={deleteMutation.error?.message}
        pending={deleteMutation.isPending}
        title={`Delete ${deleteProject.name}?`}
      /> : null}
      {repositoryProject ? <RepositoryConnectionDialog close={() => setRepositoryProject(null)} key={repositoryProject.id} project={repositoryProject} /> : null}
    </>
  )
}
