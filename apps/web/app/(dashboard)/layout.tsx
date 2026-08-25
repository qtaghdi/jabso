import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <AppShell>{children}</AppShell>
)

export default DashboardLayout
