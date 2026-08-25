'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { CopyCodeButton } from '@/components/copy-code-button'
import { Button } from '@/components/ui/button'
import {
  createDashboardProject,
  dashboardQueryKeys,
  deleteDashboardProject,
  projectsQueryOptions,
  selectDashboardProject,
} from '@/lib/dashboard-query'

export const ProjectsView = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectsQuery = useQuery(projectsQueryOptions())
  const [name, setName] = useState('')

  const syncProjects = (data: NonNullable<typeof projectsQuery.data>) => {
    queryClient.setQueryData(dashboardQueryKeys.projects, data)
    queryClient.removeQueries({ queryKey: ['dashboard', 'issues'] })
    queryClient.removeQueries({ queryKey: ['dashboard', 'issue'] })
  }

  const createMutation = useMutation({
    mutationFn: createDashboardProject,
    onSuccess: (data) => {
      syncProjects(data)
      setName('')
      router.push('/')
    },
  })
  const selectMutation = useMutation({
    mutationFn: selectDashboardProject,
    onSuccess: (data) => {
      syncProjects(data)
      router.push('/')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDashboardProject,
    onSuccess: syncProjects,
  })

  const submitProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const projectName = name.trim()
    if (projectName) createMutation.mutate(projectName)
  }

  const removeProject = (projectId: string, projectName: string) => {
    const confirmed = window.confirm(
      `Remove ${projectName} from Jabso? New events will be rejected. Existing issue data is retained for recovery.`,
    )
    if (confirmed) deleteMutation.mutate(projectId)
  }

  const items = projectsQuery.data?.items ?? []
  const mutationError = createMutation.error ?? selectMutation.error ?? deleteMutation.error

  return (
    <>
      <header className="page-header compact-page-header">
        <h1>Projects</h1>
        <p>Create an isolated issue inbox and DSN for each application.</p>
      </header>
      <section className="project-create-section" aria-labelledby="create-project-title">
        <div>
          <h2 id="create-project-title">New project</h2>
          <p>Use a short application name. Jabso generates the project ID and public key.</p>
        </div>
        <form className="project-create-form" onSubmit={submitProject}>
          <label>
            <span>Project name</span>
            <input
              maxLength={80}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Checkout web"
              required
              value={name}
            />
          </label>
          <Button disabled={createMutation.isPending} type="submit">
            {createMutation.isPending ? 'Creating…' : 'Create project'}
          </Button>
          {mutationError ? <small role="alert">{mutationError.message}</small> : null}
        </form>
      </section>
      <section className="project-list-section" aria-labelledby="project-list-title">
        <div className="section-heading-row">
          <h2 id="project-list-title">Connected projects</h2>
          <span>{items.length} {items.length === 1 ? 'project' : 'projects'}</span>
        </div>
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
              const selecting = selectMutation.isPending && selectMutation.variables === project.dsnProjectId
              const deleting = deleteMutation.isPending && deleteMutation.variables === project.id
              return (
                <article className="project-row" key={project.id}>
                  <div className="project-row-heading">
                    <div>
                      <h3>{project.name}</h3>
                      <code>{project.slug}</code>
                    </div>
                    {project.active ? <span className="active-project-label">Active</span> : null}
                  </div>
                  <div className="project-dsn">
                    <span><span>DSN</span><code>{project.dsn}</code></span>
                    <CopyCodeButton iconOnly label={`Copy ${project.name} DSN`} value={project.dsn} />
                  </div>
                  <div className="project-row-actions">
                    <Button
                      disabled={project.active || selectMutation.isPending || deleteMutation.isPending}
                      onClick={() => selectMutation.mutate(project.dsnProjectId)}
                      type="button"
                      variant="secondary"
                    >
                      {selecting ? 'Switching…' : project.active ? 'Current project' : 'Use in Issues'}
                    </Button>
                    <Button
                      className="project-delete-button"
                      disabled={deleteMutation.isPending || selectMutation.isPending}
                      onClick={() => removeProject(project.id, project.name)}
                      type="button"
                      variant="ghost"
                    >
                      {deleting ? 'Removing…' : 'Delete'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
