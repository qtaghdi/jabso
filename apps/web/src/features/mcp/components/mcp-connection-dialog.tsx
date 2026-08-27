'use client'

import { useState, type FormEvent } from 'react'
import { Button } from 'src/components/ui/button'
import { Dialog } from 'src/components/ui/dialog'
import { Input } from 'src/components/ui/input'

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
  const [name, setName] = useState('')
  const [projectIds, setProjectIds] = useState<string[]>([])
  const validationError = !name.trim()
    ? 'Enter a connection name.'
    : projectIds.length === 0 ? 'Choose at least one project.' : undefined

  const submitForm = (event: FormEvent) => {
    event.preventDefault()
    if (validationError || pending) return
    submit({ name: name.trim(), projectIds })
  }

  return (
    <Dialog
      close={close}
      description="Choose exactly which projects an AI client may inspect. This connection cannot modify Jabso data."
      eyebrow="Read-only access"
      icon={<ConnectionIcon />}
      title="Create MCP connection"
    >
      <form className="mcp-connection-form" onSubmit={submitForm}>
        <Input
          autoComplete="off"
          data-dialog-initial-focus
          disabled={pending}
          label="Connection name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder="Local Codex"
          value={name}
        />
        <fieldset className="mcp-project-fieldset" disabled={pending}>
          <legend>Allowed projects</legend>
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
          <Button disabled={pending} onClick={close} type="button" variant="secondary">Cancel</Button>
          <Button disabled={Boolean(validationError)} pending={pending} type="submit">Create connection</Button>
        </div>
      </form>
    </Dialog>
  )
}
