'use client'

import { useI18n } from 'src/shared/i18n/i18n-provider'

const SettingsLoading = () => {
  const { t } = useI18n()
  return <div aria-label={t('settings.loading')} className="settings-loading" role="status">
    <div className="skeleton-block" />
    <div className="skeleton-block" />
    <div className="skeleton-block" />
  </div>
}

export default SettingsLoading
