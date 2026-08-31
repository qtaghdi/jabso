export const ProjectsPageSkeleton = () => (
  <div className="dashboard-page-loading projects-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <div className="projects-create-skeleton" aria-hidden="true">
      <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
      <span className="skeleton-block" />
    </div>
    <div className="projects-github-skeleton" aria-hidden="true">
      <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
      <span className="skeleton-block" />
    </div>
    <div className="projects-list-heading-skeleton" aria-hidden="true">
      <span className="skeleton-block" /><span className="skeleton-block" />
    </div>
    <div className="projects-list-skeleton" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="projects-row-skeleton" key={index}>
          <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
          <span className="skeleton-block" />
          <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
        </div>
      ))}
    </div>
    <span className="sr-only">Loading projects</span>
  </div>
)
