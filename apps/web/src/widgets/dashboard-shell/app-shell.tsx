import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { SidebarShell } from 'src/widgets/dashboard-shell/sidebar-shell'

type AppShellProps = {
  children: ReactNode
}

export const AppShell = async ({ children }: AppShellProps) => {
  const initialCollapsed = (await cookies()).get('jabso-sidebar')?.value === 'collapsed'
  return <SidebarShell initialCollapsed={initialCollapsed}>{children}</SidebarShell>
}
