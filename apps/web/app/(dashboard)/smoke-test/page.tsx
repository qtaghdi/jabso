import Link from 'next/link'
import { SdkSmokeTest } from '@/components/sdk-smoke-test'
import { getProjectsResponse } from '@/lib/dashboard-data'

const SmokeTestPage = async () => {
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

export default SmokeTestPage
