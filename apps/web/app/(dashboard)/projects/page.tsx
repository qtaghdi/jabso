import { Suspense } from 'react'
import { ProjectsView } from '@/components/projects-view'
import { getProjectsResponse } from '@/lib/dashboard-data'

const ProjectsPageData = async () => <ProjectsView initialData={await getProjectsResponse()} />

const ProjectsPageLoading = () => (
  <div className="dashboard-page-loading projects-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <span className="skeleton-block skeleton-project-form" />
    <div className="skeleton-table">
      {Array.from({ length: 3 }, (_, index) => <span className="skeleton-block" key={index} />)}
    </div>
    <span className="sr-only">Loading projects</span>
  </div>
)

const ProjectsPage = () => (
  <Suspense fallback={<ProjectsPageLoading />}>
    <ProjectsPageData />
  </Suspense>
)

export default ProjectsPage
