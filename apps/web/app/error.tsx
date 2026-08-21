'use client'

type ErrorPageProps = { reset: () => void }

const ErrorPage = ({ reset }: ErrorPageProps) => (
  <div className="route-state"><h1>Could not load Jabso</h1><p>Check that the collector and PostgreSQL are running, then try again.</p><button type="button" onClick={reset}>Try again</button></div>
)

export default ErrorPage
