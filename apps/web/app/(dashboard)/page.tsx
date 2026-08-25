import { Suspense } from 'react'
import { IssuesView } from '@/components/issues-view'

const IssuesPage = () => (
  <Suspense fallback={<div className="issues-inline-loading" role="status"><span className="skeleton-block skeleton-title" /><span className="sr-only">Loading issues</span></div>}>
    <IssuesView />
  </Suspense>
)

export default IssuesPage
