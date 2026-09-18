'use client'

import { useI18n } from 'src/shared/i18n/i18n-provider'

type OnboardingLoadingProps = {
  description?: string
}

export const OnboardingLoading = ({
  description,
}: OnboardingLoadingProps) => {
  const { t } = useI18n()
  return (
    <section className="onboarding-loading" aria-labelledby="onboarding-loading-title" role="status">
      <span className="onboarding-loading-spinner" aria-hidden="true" />
      <p className="onboarding-step">{t('onboarding.gettingReady')}</p>
      <h1 id="onboarding-loading-title">{t('onboarding.preparing')}</h1>
      <p className="onboarding-copy">{description ?? t('onboarding.syncing')}</p>
    </section>
  )
}
