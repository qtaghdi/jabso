import type { ReactNode } from 'react'
import { AppShell } from 'src/widgets/dashboard-shell/app-shell'

const DashboardLayout = ({ children }: { children: ReactNode }) => <AppShell>{children}</AppShell>

export default DashboardLayout
