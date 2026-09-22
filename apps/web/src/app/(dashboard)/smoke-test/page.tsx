import Link from 'next/link'
import { Suspense } from 'react'
import { SdkSmokeTest } from 'src/screens/sdk/sdk-smoke-test'
import { SmokeTestSkeleton } from 'src/screens/sdk/smoke-test-skeleton'
import { getI18n } from 'src/shared/i18n/locale'
import { getProjectsResponse } from 'src/shared/query/dashboard-data'

const SmokeTestPageData = async () => {
  const [{ items }, { t }] = await Promise.all([getProjectsResponse(), getI18n()])
  const activeProject = items.find((project) => project.active)
  if (!activeProject) {
    return <div className="empty-state"><h1>{t('sdk.noActiveProject')}</h1><p>{t('sdk.noActiveProjectDescription')}</p><Link className="text-link" href="/projects">{t('sdk.openProjects')}</Link></div>
  }

  return (
    <>
      <header className="page-header"><h1>{t('sdk.smokeTitle')}</h1><p>{t('sdk.smokeDescription')}</p></header>
      <SdkSmokeTest dsn={activeProject.dsn} />
      <Link className="text-link" href="/">{t('sdk.returnIssues')}</Link>
    </>
  )
}

const SmokeTestPage = () => (
  <Suspense fallback={<SmokeTestSkeleton />}>
    <SmokeTestPageData />
  </Suspense>
)

export default SmokeTestPage
