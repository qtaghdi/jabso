import Link from 'next/link'
import { Suspense } from 'react'
import { SdkSmokeTest } from 'src/screens/sdk/sdk-smoke-test'
import { SmokeTestSkeleton } from 'src/screens/sdk/smoke-test-skeleton'
import { getProjectsResponse } from 'src/shared/query/dashboard-data'

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
  <Suspense fallback={<SmokeTestSkeleton />}>
    <SmokeTestPageData />
  </Suspense>
)

export default SmokeTestPage
