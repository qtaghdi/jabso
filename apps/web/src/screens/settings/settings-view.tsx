'use client'

import { LanguageSwitcher } from 'src/shared/i18n/language-switcher'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { WorkspaceSettingsPanel } from 'src/widgets/workspace-switcher/workspace-settings-panel'
import { dashboardPageHeaderClass, dashboardSurfaceClass } from 'src/shared/ui/dashboard-styles'

type SettingsViewProps = {
  workspace: {
    canManage: boolean
    name: string
    organizationId: string | null
    role: string | null
    userId: string
  }
}

export const SettingsView = ({ workspace }: SettingsViewProps) => {
  const { t } = useI18n()
  const role = workspace.role === 'owner' ? 'owner' : 'admin'

  return (
    <>
      <header className={`${dashboardPageHeaderClass} max-w-[760px]`}>
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.description')}</p>
      </header>
      <div className="grid max-w-5xl gap-4">
        <section className={`${dashboardSurfaceClass} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 p-6 max-[620px]:grid-cols-1 max-[620px]:items-start max-[620px]:p-5`} aria-labelledby="language-settings-title">
          <header className="settings-section-heading">
            <div>
              <h2 id="language-settings-title">{t('i18n.language')}</h2>
              <p>{t('i18n.languageDescription')}</p>
            </div>
          </header>
          <LanguageSwitcher />
        </section>
        {workspace.canManage ? (
          <WorkspaceSettingsPanel
            currentRole={workspace.organizationId ? role : null}
            currentUserId={workspace.userId}
            name={workspace.name}
            organizationId={workspace.organizationId}
          />
        ) : (
          <section className={`${dashboardSurfaceClass} grid gap-5 p-6 max-[620px]:p-5`} id="workspace-settings" aria-labelledby="workspace-details-title">
            <header className="settings-section-heading">
              <div>
                <h2 id="workspace-details-title">{t('workspace.settingsTitle')}</h2>
                <p>{t('workspace.accessDenied')}</p>
              </div>
            </header>
            <div className="settings-workspace-identity">
              <span aria-hidden="true">{workspace.name.slice(0, 2).toUpperCase()}</span>
              <strong>{workspace.name}</strong>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
