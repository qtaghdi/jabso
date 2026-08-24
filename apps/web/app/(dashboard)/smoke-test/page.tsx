import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { SdkSmokeTest } from '@/components/sdk-smoke-test'
import { requireOwner } from '@/lib/auth'
import { getActiveProject, projectDsn } from '@/lib/projects'

const SmokeTestPage = async () => {
  await requireOwner()
  const activeProject = await getActiveProject()
  if (!activeProject) redirect('/projects')

  return (
    <AppShell>
      <header className="page-header"><h1>SDK smoke test</h1><p>Verify the browser SDK → collector → issue inbox path.</p></header>
      <SdkSmokeTest dsn={projectDsn(activeProject)} />
      <Link className="text-link" href="/">Return to Issues</Link>
    </AppShell>
  )
}

export default SmokeTestPage
