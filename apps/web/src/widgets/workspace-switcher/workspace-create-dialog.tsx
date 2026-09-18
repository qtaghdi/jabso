'use client'

import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'
import { Input } from 'src/shared/ui/input'
import type { WorkspaceKind } from 'src/shared/api/workspaces'

type WorkspaceCreateDialogProps = {
  close: () => void
}

const WorkspaceIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 19.5v-12L12 4l8 3.5v12M8 19.5v-7h8v7M8.5 9h.01M12 9h.01M15.5 9h.01" />
  </svg>
)

export const WorkspaceCreateDialog = ({ close }: WorkspaceCreateDialogProps) => {
  const { t } = useI18n()
  const [kind, setKind] = useState<Extract<WorkspaceKind, 'team' | 'organization'>>('team')
  const [name, setName] = useState('')
  const [createdOrganizationId, setCreatedOrganizationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sharedWorkspaceOptions: Array<{
    description: string
    kind: Extract<WorkspaceKind, 'team' | 'organization'>
    label: string
  }> = [
    { kind: 'team', label: t('workspace.typeTeam'), description: t('workspace.typeTeamDescription') },
    { kind: 'organization', label: t('workspace.typeOrganization'), description: t('workspace.typeOrganizationDescription') },
  ]

  const provision = async (organizationName: string) => {
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, name: organizationName }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(result?.error ?? t('workspace.createError'))
    }
  }

  const createWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const workspaceName = name.trim()
    if (!workspaceName) {
      setError(t('workspace.enterName'))
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
          throw new Error(organization.error?.message ?? t('workspace.createError'))
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
      setError(caught instanceof Error ? caught.message : t('workspace.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      close={close}
      description={t('workspace.createDescription')}
      icon={<WorkspaceIcon />}
      size="sm"
      title={t('workspace.create')}
    >
      <form className="workspace-create-form" onSubmit={createWorkspace}>
        <fieldset className="workspace-kind-fieldset">
          <legend>{t('workspace.type')}</legend>
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
          disabled={Boolean(createdOrganizationId)}
          error={error ?? undefined}
          label={t('workspace.name')}
          maxLength={80}
          name="workspace-name"
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError(null)
          }}
          placeholder={kind === 'team' ? 'Acme engineering' : 'Acme, Inc.'}
          value={name}
        />
        <footer className="ui-dialog-actions">
          <Button onClick={close} type="button" variant="ghost">{t('common.cancel')}</Button>
          <Button pending={isSubmitting} type="submit">{t('workspace.create')}</Button>
        </footer>
      </form>
    </Dialog>
  )
}
