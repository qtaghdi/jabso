type OnboardingLoadingProps = {
  description?: string
}

export const OnboardingLoading = ({
  description = 'Syncing your account and preparing workspace setup.',
}: OnboardingLoadingProps) => (
  <section className="onboarding-loading" aria-labelledby="onboarding-loading-title" role="status">
    <span className="onboarding-loading-spinner" aria-hidden="true" />
    <p className="onboarding-step">Getting things ready</p>
    <h1 id="onboarding-loading-title">Preparing your workspace</h1>
    <p className="onboarding-copy">{description}</p>
  </section>
)
