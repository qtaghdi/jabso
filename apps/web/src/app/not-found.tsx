import Link from 'next/link'

const NotFound = () => (
  <div className="route-state"><h1>Issue not found</h1><p>This issue does not exist in the configured project.</p><Link className="font-semibold text-link underline-offset-3" href="/">Return to Issues</Link></div>
)

export default NotFound
