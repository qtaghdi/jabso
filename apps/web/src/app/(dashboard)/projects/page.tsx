import { Suspense } from 'react'
import { ProjectsPageSkeleton } from 'src/screens/projects/projects-page-skeleton'
import { ProjectsView } from 'src/screens/projects/projects-view'
import { getProjectsResponse } from 'src/shared/query/dashboard-data'

const ProjectsPageData = async () => <ProjectsView initialData={await getProjectsResponse()} />

const ProjectsPage = () => (
  <Suspense fallback={<ProjectsPageSkeleton />}>
    <ProjectsPageData />
  </Suspense>
)

export default ProjectsPage
