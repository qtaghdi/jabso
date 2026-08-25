'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { SdkSmokeTest } from '@/components/sdk-smoke-test'
import { projectsQueryOptions } from '@/lib/dashboard-query'

const SmokeTestPage = () => {
  const projectsQuery = useQuery(projectsQueryOptions())
  if (projectsQuery.isPending) {
    return <div className="smoke-test-loading" role="status"><span className="skeleton-block skeleton-title" /><span className="sr-only">Loading smoke test</span></div>
  }
  if (projectsQuery.isError) {
    return <div className="route-state" role="alert"><h1>Could not load the smoke test</h1><p>{projectsQuery.error.message}</p></div>
  }
  const activeProject = projectsQuery.data.items.find((project) => project.active)
  if (!activeProject) {
    return <div className="empty-state"><h1>No active project</h1><p>Create or select a project first.</p><Link className="text-link" href="/projects">Open Projects</Link></div>
  }

  return (
    <>
      <header className="page-header"><h1>SDK smoke test</h1><p>Verify the browser SDK → collector → issue inbox path.</p></header>
      <SdkSmokeTest dsn={activeProject.dsn} />
      <Link className="text-link" href="/">Return to Issues</Link>
    </>
  )
}

export default SmokeTestPage
