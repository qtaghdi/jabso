import { ProjectsView } from '@/components/projects-view'
import { getProjectsResponse } from '@/lib/dashboard-data'

const ProjectsPage = async () => <ProjectsView initialData={await getProjectsResponse()} />

export default ProjectsPage
