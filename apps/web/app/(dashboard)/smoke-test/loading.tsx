import { AppShell } from '@/components/app-shell'

const SmokeTestLoading = () => (
  <AppShell>
    <div className="smoke-test-loading" role="status">
      <header className="page-header">
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block skeleton-copy" />
      </header>
      <span className="skeleton-block skeleton-smoke-panel" />
      <span className="sr-only">Loading SDK smoke test</span>
    </div>
  </AppShell>
)

export default SmokeTestLoading
