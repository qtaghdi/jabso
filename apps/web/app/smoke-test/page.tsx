import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { SdkSmokeTest } from '@/components/sdk-smoke-test'

const SmokeTestPage = () => (
  <AppShell>
    <header className="page-header"><h1>SDK smoke test</h1><p>Verify the browser SDK → collector → issue inbox path.</p></header>
    <SdkSmokeTest />
    <Link className="text-link" href="/">Return to Issues</Link>
  </AppShell>
)

export default SmokeTestPage
