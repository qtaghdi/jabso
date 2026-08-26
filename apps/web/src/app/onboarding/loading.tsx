import { JabsoWordmark } from 'src/components/brand/jabso-wordmark'
import { OnboardingLoading } from 'src/features/onboarding/components/onboarding-loading'

const OnboardingRouteLoading = () => (
  <main className="onboarding-page">
    <header className="onboarding-brand"><JabsoWordmark /></header>
    <div className="onboarding-card"><OnboardingLoading /></div>
  </main>
)

export default OnboardingRouteLoading
