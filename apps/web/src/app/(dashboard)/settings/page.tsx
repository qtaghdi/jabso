import { SettingsView } from 'src/screens/settings/settings-view'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'

const SettingsPage = async () => {
  const workspace = await requireWorkspace()
  return <SettingsView workspace={{
    canManage: workspace.canManage,
    name: workspace.name,
    organizationId: workspace.orgId,
    role: workspace.orgRole,
    userId: workspace.userId,
  }} />
}

export default SettingsPage
