import Link from 'next/link'
import { Suspense } from 'react'
import { SdkSmokeTest } from 'src/screens/sdk/sdk-smoke-test'
import { SmokeTestSkeleton } from 'src/screens/sdk/smoke-test-skeleton'
import { getI18n } from 'src/shared/i18n/locale'
import { getProjectsResponse } from 'src/shared/query/dashboard-data'
import { dashboardEmptyStateClass, dashboardPageHeaderClass } from 'src/shared/ui/dashboard-styles'

const SmokeTestPageData = async () => {
  const [{ items }, { t }] = await Promise.all([getProjectsResponse(), getI18n()])
  const activeProject = items.find((project) => project.active)
  if (!activeProject) {
    return <div className={dashboardEmptyStateClass}><h1>{t('sdk.noActiveProject')}</h1><p>{t('sdk.noActiveProjectDescription')}</p><Link className="font-semibold text-link underline-offset-3" href="/projects">{t('sdk.openProjects')}</Link></div>
  }

  return (
    <>
      <header className={dashboardPageHeaderClass}><h1>{t('sdk.smokeTitle')}</h1><p>{t('sdk.smokeDescription')}</p></header>
      <SdkSmokeTest dsn={activeProject.dsn} />
      <Link className="font-semibold text-link underline-offset-3" href="/">{t('sdk.returnIssues')}</Link>
    </>
  )
}

const SmokeTestPage = () => (
  <Suspense fallback={<SmokeTestSkeleton />}>
    <SmokeTestPageData />
  </Suspense>
)

export default SmokeTestPage
