'use client'

import { CopyCodeButton } from 'src/shared/ui/copy-code-button'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { useI18n } from 'src/shared/i18n/i18n-provider'

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
  const { t } = useI18n()
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
      closeLabel={t('common.close')}
      description={t('mcp.secretDescription')}
      eyebrow={t('mcp.connectionCreated')}
      icon={<KeyIcon />}
      title={name}
    >
      <div className="mcp-secret-warning">{t('mcp.secretWarning')}</div>
      <section className="mcp-token-section">
        <div className="mcp-code-heading">
          <span>{t('mcp.bearerToken')}</span>
          <CopyCodeButton copiedLabel={t('common.copied')} iconOnly label={t('mcp.copyBearerToken')} value={token} />
        </div>
        <code className="mcp-token-value">{token}</code>
      </section>
      <section className="mcp-token-section">
        <div className="mcp-code-heading">
          <span>{t('mcp.clientConfiguration')}</span>
          <CopyCodeButton copiedLabel={t('common.copied')} iconOnly label={t('mcp.copyConfiguration')} value={configuration} />
        </div>
        <pre className="mcp-config-code">{configuration}</pre>
      </section>
      <div className="ui-dialog-actions">
        <Button data-dialog-initial-focus onClick={close} type="button">{t('mcp.saveConfirmed')}</Button>
      </div>
    </Dialog>
  )
}
