import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { SidebarShell } from '@/components/sidebar-shell'

type AppShellProps = {
  activeNav?: 'issues' | 'projects'
  children: ReactNode
}

export const AppShell = async ({ activeNav = 'issues', children }: AppShellProps) => {
  const initialCollapsed = (await cookies()).get('jabso-sidebar')?.value === 'collapsed'
  return <SidebarShell activeNav={activeNav} initialCollapsed={initialCollapsed}>{children}</SidebarShell>
}
