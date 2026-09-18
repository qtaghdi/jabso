'use client'

import { useState, type FormEvent } from 'react'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { Input } from 'src/shared/ui/input'
import { useI18n } from 'src/shared/i18n/i18n-provider'

type ProjectOption = {
  id: string
  name: string
  slug: string
}

type McpConnectionDialogProps = {
  close: () => void
  error?: string
  pending: boolean
  projects: ProjectOption[]
  submit: (input: { name: string; projectIds: string[] }) => void
}

const ConnectionIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8 7.5h8M8 16.5h8M7.5 8v8M16.5 8v8" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
)

export const McpConnectionDialog = ({
  close,
  error,
  pending,
  projects,
  submit,
}: McpConnectionDialogProps) => {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [projectIds, setProjectIds] = useState<string[]>([])
  const validationError = !name.trim()
    ? t('mcp.validationName')
    : projectIds.length === 0 ? t('mcp.validationProject') : undefined

  const submitForm = (event: FormEvent) => {
    event.preventDefault()
    if (validationError || pending) return
    submit({ name: name.trim(), projectIds })
  }

  return (
    <Dialog
      close={close}
      description={t('mcp.createDescription')}
      eyebrow={t('mcp.readOnly')}
      icon={<ConnectionIcon />}
      title={t('mcp.create')}
    >
      <form className="mcp-connection-form" onSubmit={submitForm}>
        <Input
          autoComplete="off"
          data-dialog-initial-focus
          disabled={pending}
          label={t('mcp.connectionName')}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder="Local Codex"
          value={name}
        />
        <fieldset className="mcp-project-fieldset" disabled={pending}>
          <legend>{t('mcp.allowedProjects')}</legend>
          <div className="mcp-project-options">
            {projects.map((project) => (
              <label className="mcp-project-option" key={project.id}>
                <input
                  checked={projectIds.includes(project.id)}
                  onChange={(event) => {
                    setProjectIds((current) => event.target.checked
                      ? [...current, project.id]
                      : current.filter((id) => id !== project.id))
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>{project.name}</strong>
                  <code>{project.slug}</code>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="ui-dialog-actions">
          <Button disabled={pending} onClick={close} type="button" variant="secondary">{t('common.cancel')}</Button>
          <Button disabled={Boolean(validationError)} pending={pending} type="submit">{t('mcp.create')}</Button>
        </div>
      </form>
    </Dialog>
  )
}
