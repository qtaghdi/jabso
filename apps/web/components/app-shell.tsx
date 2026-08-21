import Link from 'next/link'
import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

const IssueIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3.5 21 19H3L12 3.5Z" />
    <path d="M12 9v4.5M12 17h.01" />
  </svg>
)

const ProjectIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M3.5 7.5h17v12h-17zM3.5 7.5l3-3h5l2 3" />
  </svg>
)

export const AppShell = ({ children }: AppShellProps) => (
  <div className="app-shell">
    <aside className="sidebar">
      <Link className="wordmark" href="/" aria-label="Jabso issue inbox">
        Jabso
      </Link>
      <nav aria-label="Primary navigation">
        <Link className="nav-item nav-item-active" href="/">
          <IssueIcon />
          Issues
        </Link>
        <span className="nav-item nav-item-disabled" aria-disabled="true">
          <ProjectIcon />
          Projects
        </span>
      </nav>
      <div className="sidebar-footer">
        <Link href="/smoke-test">SDK smoke test</Link>
        <span>Local project</span>
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </div>
)
