import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth'

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  await requireWorkspace()
  return <AppShell>{children}</AppShell>
}

export default DashboardLayout
