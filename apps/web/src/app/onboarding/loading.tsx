import { JabsoWordmark } from 'src/shared/brand/jabso-wordmark'
import { OnboardingLoading } from 'src/screens/onboarding/onboarding-loading'

const OnboardingRouteLoading = () => (
  <main className="onboarding-page">
    <header className="onboarding-brand"><JabsoWordmark /></header>
    <div className="onboarding-card"><OnboardingLoading /></div>
  </main>
)

export default OnboardingRouteLoading
