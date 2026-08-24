import { AppShell } from '@/components/app-shell'
import { CopyCodeButton } from '@/components/copy-code-button'
import { Button } from '@/components/ui/button'
import { getActiveProject, listProjects, projectDsn } from '@/lib/projects'
import { createProjectAction, selectProjectAction } from './actions'

export const dynamic = 'force-dynamic'

type ProjectsPageProps = {
  searchParams: Promise<{ error?: string }>
}

const ProjectsPage = async ({ searchParams }: ProjectsPageProps) => {
  const [{ items }, activeProject, parameters] = await Promise.all([
    listProjects(),
    getActiveProject(),
    searchParams,
  ])
  const nameError = parameters.error === 'invalid-name'

  return (
    <AppShell activeNav="projects">
      <header className="page-header compact-page-header">
        <h1>Projects</h1>
        <p>Create an isolated issue inbox and DSN for each application.</p>
      </header>
      <section className="project-create-section" aria-labelledby="create-project-title">
        <div>
          <h2 id="create-project-title">New project</h2>
          <p>Use a short application name. Jabso generates the project ID and public key.</p>
        </div>
        <form className="project-create-form" action={createProjectAction}>
          <label>
            <span>Project name</span>
            <input
              aria-describedby={nameError ? 'project-name-error' : undefined}
              aria-invalid={nameError ? true : undefined}
              maxLength={80}
              name="name"
              placeholder="Checkout web"
              required
            />
          </label>
          <Button type="submit">Create project</Button>
          {nameError ? <small id="project-name-error">Enter a project name between 1 and 80 characters.</small> : null}
        </form>
      </section>
      <section className="project-list-section" aria-labelledby="project-list-title">
        <div className="section-heading-row">
          <h2 id="project-list-title">Connected projects</h2>
          <span>{items.length} {items.length === 1 ? 'project' : 'projects'}</span>
        </div>
        {items.length === 0 ? <p className="muted-copy">No projects are connected yet.</p> : (
          <div className="project-list">
            {items.map((project) => {
              const active = project.dsnProjectId === activeProject?.dsnProjectId
              const dsn = projectDsn(project)
              return (
                <article className="project-row" key={project.id}>
                  <div className="project-row-heading">
                    <div>
                      <h3>{project.name}</h3>
                      <code>{project.slug}</code>
                    </div>
                    {active ? <span className="active-project-label">Active</span> : null}
                  </div>
                  <div className="project-dsn">
                    <span><span>DSN</span><code>{dsn}</code></span>
                    <CopyCodeButton iconOnly label={`Copy ${project.name} DSN`} value={dsn} />
                  </div>
                  <form action={selectProjectAction}>
                    <input name="project-id" type="hidden" value={project.dsnProjectId} />
                    <Button disabled={active} type="submit" variant="secondary">
                      {active ? 'Current project' : 'Use in Issues'}
                    </Button>
                  </form>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </AppShell>
  )
}

export default ProjectsPage
