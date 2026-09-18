'use client'

import { useI18n } from 'src/shared/i18n/i18n-provider'

type AuthTransitionProps = {
  label: string
}

export const AuthTransition = ({ label }: AuthTransitionProps) => {
  const { t } = useI18n()
  return (
    <div className="auth-transition" role="status" aria-live="polite">
      <span className="auth-transition-spinner" aria-hidden="true" />
      <strong>{label}</strong>
      <span>{t('auth.preparingWorkspace')}</span>
    </div>
  )
}
