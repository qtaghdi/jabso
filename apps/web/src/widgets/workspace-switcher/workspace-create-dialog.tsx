'use client'

import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { Input } from 'src/shared/ui/input'
import type { WorkspaceKind } from 'src/shared/api/workspaces'

type WorkspaceCreateDialogProps = {
  close: () => void
}

const sharedWorkspaceOptions: Array<{
  description: string
  kind: Extract<WorkspaceKind, 'team' | 'organization'>
  label: string
}> = [
  { kind: 'team', label: 'Team', description: 'For a small group sharing projects and errors.' },
  { kind: 'organization', label: 'Organization', description: 'For multiple teams and managed membership.' },
]

const WorkspaceIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 19.5v-12L12 4l8 3.5v12M8 19.5v-7h8v7M8.5 9h.01M12 9h.01M15.5 9h.01" />
  </svg>
)

export const WorkspaceCreateDialog = ({ close }: WorkspaceCreateDialogProps) => {
  const [kind, setKind] = useState<Extract<WorkspaceKind, 'team' | 'organization'>>('team')
  const [name, setName] = useState('')
  const [createdOrganizationId, setCreatedOrganizationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const provision = async (organizationName: string) => {
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, name: organizationName }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(result?.error ?? 'Could not create the workspace')
    }
  }

  const createWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const workspaceName = name.trim()
    if (!workspaceName) {
      setError('Enter a workspace name')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      let organizationId = createdOrganizationId
      if (!organizationId) {
        const slugBase = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace'
        const organization = await authClient.organization.create({
          name: workspaceName,
          slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
        })
        if (organization.error || !organization.data) {
          throw new Error(organization.error?.message ?? 'Could not create the workspace')
        }
        organizationId = organization.data.id
        setCreatedOrganizationId(organizationId)
      }
      const active = await authClient.organization.setActive({ organizationId })
      if (active.error) throw new Error(active.error.message)
      await provision(workspaceName)
      close()
      window.location.replace(new URL('/', window.location.href).href)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      close={close}
      description="Create a shared error inbox. You can invite members after setup."
      icon={<WorkspaceIcon />}
      size="sm"
      title="Create a workspace"
    >
      <form className="workspace-create-form" onSubmit={createWorkspace}>
        <fieldset className="workspace-kind-fieldset">
          <legend>Workspace type</legend>
          <div className="workspace-kind-options">
            {sharedWorkspaceOptions.map((option) => (
              <label
                className={`workspace-kind-option ${kind === option.kind ? 'workspace-kind-option-active' : ''}`}
                key={option.kind}
              >
                <input
                  checked={kind === option.kind}
                  disabled={Boolean(createdOrganizationId)}
                  name="workspace-kind"
                  onChange={() => setKind(option.kind)}
                  type="radio"
                  value={option.kind}
                />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <Input
          autoComplete="organization"
          autoFocus
          disabled={Boolean(createdOrganizationId)}
          error={error ?? undefined}
          label="Workspace name"
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError(null)
          }}
          placeholder={kind === 'team' ? 'Acme engineering' : 'Acme, Inc.'}
          value={name}
        />
        <footer className="ui-dialog-actions">
          <Button onClick={close} type="button" variant="ghost">Cancel</Button>
          <Button pending={isSubmitting} type="submit">Create workspace</Button>
        </footer>
      </form>
    </Dialog>
  )
}
