export const McpPageSkeleton = () => (
  <div className="dashboard-page-loading mcp-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <div className="mcp-endpoint-skeleton" aria-hidden="true">
      <div><span className="skeleton-block" /><span className="skeleton-block" /></div>
      <span className="skeleton-block" />
    </div>
    <div className="mcp-list-heading-skeleton" aria-hidden="true">
      <span className="skeleton-block" /><span className="skeleton-block" />
    </div>
    <div className="mcp-list-skeleton" aria-hidden="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div className="mcp-row-skeleton" key={index}>
          <span className="skeleton-block" /><span className="skeleton-block" />
          <span className="skeleton-block" /><span className="skeleton-block" />
        </div>
      ))}
    </div>
    <span className="sr-only">Loading MCP connections</span>
  </div>
)
