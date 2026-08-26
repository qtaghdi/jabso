import Link from 'next/link'
import { Suspense } from 'react'
import { SdkSmokeTest } from 'src/features/sdk/components/sdk-smoke-test'
import { getProjectsResponse } from 'src/lib/dashboard/dashboard-data'

const SmokeTestPageData = async () => {
  const activeProject = (await getProjectsResponse()).items.find((project) => project.active)
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

const SmokeTestPage = () => (
  <Suspense fallback={<div className="dashboard-page-loading smoke-test-page-loading" role="status"><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-code" /><span className="sr-only">Loading smoke test</span></div>}>
    <SmokeTestPageData />
  </Suspense>
)

export default SmokeTestPage
