'use client'

import { CopyCodeButton } from 'src/components/ui/copy-code-button'
import { Button } from 'src/components/ui/button'
import { Dialog } from 'src/components/ui/dialog'

type McpTokenDialogProps = {
  close: () => void
  endpoint: string
  name: string
  token: string
}

const KeyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="8" cy="12" r="4" />
    <path d="M12 12h9M17 12v3M20 12v2" />
  </svg>
)

export const McpTokenDialog = ({ close, endpoint, name, token }: McpTokenDialogProps) => {
  const configuration = JSON.stringify({
    mcpServers: {
      jabso: {
        url: endpoint,
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  }, null, 2)

  return (
    <Dialog
      close={close}
      description="Copy this token now. Jabso stores only its hash, so it cannot be shown again."
      eyebrow="Connection created"
      icon={<KeyIcon />}
      title={name}
    >
      <div className="mcp-secret-warning">Treat this token like a password. It grants read-only access to the selected projects.</div>
      <section className="mcp-token-section">
        <div className="mcp-code-heading">
          <span>Bearer token</span>
          <CopyCodeButton iconOnly label="Copy bearer token" value={token} />
        </div>
        <code className="mcp-token-value">{token}</code>
      </section>
      <section className="mcp-token-section">
        <div className="mcp-code-heading">
          <span>Client configuration</span>
          <CopyCodeButton iconOnly label="Copy MCP client configuration" value={configuration} />
        </div>
        <pre className="mcp-config-code">{configuration}</pre>
      </section>
      <div className="ui-dialog-actions">
        <Button data-dialog-initial-focus onClick={close} type="button">I saved it</Button>
      </div>
    </Dialog>
  )
}
