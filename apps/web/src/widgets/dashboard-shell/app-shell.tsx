import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { findWorkspace } from 'src/shared/api/workspaces'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { SidebarShell } from 'src/widgets/dashboard-shell/sidebar-shell'

type AppShellProps = {
  children: ReactNode
}

export const AppShell = async ({ children }: AppShellProps) => {
  const [cookieStore, workspace] = await Promise.all([cookies(), requireWorkspace()])
  const initialCollapsed = cookieStore.get('jabso-sidebar')?.value === 'collapsed'
  const personalWorkspace = workspace.kind === 'personal'
    ? workspace
    : await findWorkspace(`user:${workspace.userId}`)
  return (
    <SidebarShell
      activeWorkspaceName={workspace.name}
      initialCollapsed={initialCollapsed}
      personalWorkspaceName={personalWorkspace?.name ?? null}
    >
      {children}
    </SidebarShell>
  )
}
