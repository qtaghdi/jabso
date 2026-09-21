import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { SidebarShell } from 'src/widgets/dashboard-shell/sidebar-shell'

type AppShellProps = {
  children: ReactNode
}

export const AppShell = async ({ children }: AppShellProps) => {
  const [cookieStore, workspace] = await Promise.all([cookies(), requireWorkspace()])
  const initialCollapsed = cookieStore.get('jabso-sidebar')?.value === 'collapsed'
  return (
    <SidebarShell
      activeWorkspace={{ kind: workspace.kind, name: workspace.name }}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </SidebarShell>
  )
}
