import { Suspense } from 'react'
import { ProjectsPageSkeleton } from 'src/screens/projects/projects-page-skeleton'
import { ProjectsView } from 'src/screens/projects/projects-view'
import { listGitHubInstallations } from 'src/shared/api/github'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { getProjectsResponse } from 'src/shared/query/dashboard-data'

const githubResultValues = new Set([
  'already-connected',
  'connected',
  'expired',
  'invalid-callback',
  'not-authorized',
  'not-configured',
  'requested',
  'unavailable',
])

const ProjectsPageData = async ({ githubResult }: { githubResult?: string }) => {
  const [initialData, initialGitHubData, workspace] = await Promise.all([
    getProjectsResponse(),
    listGitHubInstallations(),
    requireWorkspace(),
  ])
  return <ProjectsView
    canManage={workspace.canManage}
    githubResult={githubResultValues.has(githubResult ?? '') ? githubResult : undefined}
    initialData={initialData}
    initialGitHubData={initialGitHubData}
  />
}

const ProjectsPage = async ({ searchParams }: PageProps<'/projects'>) => {
  const github = (await searchParams).github
  const githubResult = Array.isArray(github) ? github[0] : github
  return (
    <Suspense fallback={<ProjectsPageSkeleton />}>
      <ProjectsPageData githubResult={githubResult} />
    </Suspense>
  )
}

export default ProjectsPage
