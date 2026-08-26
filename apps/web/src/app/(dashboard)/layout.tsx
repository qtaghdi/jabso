import type { ReactNode } from 'react'
import { AppShell } from 'src/features/shell/components/app-shell'
import { requireWorkspace } from 'src/lib/auth/workspace-auth'

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  await requireWorkspace()
  return <AppShell>{children}</AppShell>
}

export default DashboardLayout
