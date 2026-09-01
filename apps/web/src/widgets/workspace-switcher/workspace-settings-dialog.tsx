'use client'

import { useState, type FormEvent } from 'react'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { Input } from 'src/shared/ui/input'
import { WorkspaceMembersPanel } from 'src/widgets/workspace-switcher/workspace-members-panel'

type WorkspaceSettingsDialogProps = {
  close: () => void
  currentRole: 'admin' | 'owner'
  currentUserId: string
  name: string
  organizationId: string
  openDelete: () => void
}

const SettingsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
    <path d="m19 13.5 1.5 1.2-2 3.5-1.9-.7a7.8 7.8 0 0 1-2.1 1.2l-.3 2h-4l-.3-2a7.8 7.8 0 0 1-2.1-1.2l-1.9.7-2-3.5 1.5-1.2a7.6 7.6 0 0 1 0-2.5L3.9 9.8l2-3.5 1.9.7a7.8 7.8 0 0 1 2.1-1.2l.3-2h4l.3 2A7.8 7.8 0 0 1 16.6 7l1.9-.7 2 3.5L19 11a7.6 7.6 0 0 1 0 2.5Z" />
  </svg>
)

export const WorkspaceSettingsDialog = ({
  close,
  currentRole,
  currentUserId,
  name: initialName,
  organizationId,
  openDelete,
}: WorkspaceSettingsDialogProps) => {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      setError('Enter a workspace name')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/dashboard/workspace', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error ?? 'Could not update the workspace')
      }
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the workspace')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      close={close}
      description="Manage this workspace's details and access."
      icon={<SettingsIcon />}
      size="lg"
      title="Workspace settings"
    >
      <form className="workspace-settings-form" onSubmit={save}>
        <Input
          autoComplete="organization"
          autoFocus
          error={error ?? undefined}
          label="Workspace name"
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError(null)
          }}
          value={name}
        />
        <footer className="ui-dialog-actions">
          <Button disabled={isSubmitting} onClick={close} type="button" variant="ghost">Cancel</Button>
          <Button pending={isSubmitting} type="submit">Save changes</Button>
        </footer>
      </form>
      <WorkspaceMembersPanel
        currentRole={currentRole}
        currentUserId={currentUserId}
        organizationId={organizationId}
      />
      <section className="workspace-danger-zone">
        <div>
          <strong>Delete workspace</strong>
          <p>Permanently remove this organization and all of its Jabso data.</p>
        </div>
        <Button
          onClick={() => {
            close()
            openDelete()
          }}
          type="button"
          variant="danger"
        >
          Delete
        </Button>
      </section>
    </Dialog>
  )
}
