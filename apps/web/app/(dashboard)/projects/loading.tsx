import { AppShell } from '@/components/app-shell'

const ProjectsLoading = () => (
  <AppShell activeNav="projects">
    <div role="status">
      <header className="page-header compact-page-header">
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block skeleton-copy" />
      </header>
      <span className="skeleton-block skeleton-project-create" />
      <div className="skeleton-project-list">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <span className="sr-only">Loading projects</span>
    </div>
  </AppShell>
)

export default ProjectsLoading
