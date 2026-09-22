'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { AlertDialog } from 'src/shared/ui/alert-dialog'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'
import { WorkspaceMembersPanel } from 'src/widgets/workspace-switcher/workspace-members-panel'

type WorkspaceSettingsPanelProps = {
  currentRole: 'admin' | 'owner' | null
  currentUserId: string
  name: string
  organizationId: string | null
}

export const WorkspaceSettingsPanel = ({
  currentRole,
  currentUserId,
  name: initialName,
  organizationId,
}: WorkspaceSettingsPanelProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      setError(t('workspace.enterName'))
      return
    }
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/dashboard/workspace', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error ?? t('workspace.couldNotUpdate'))
      }
      setSuccess(t('workspace.updated'))
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('workspace.couldNotUpdate'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteWorkspace = async () => {
    if (!organizationId || isDeleting) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      const response = await fetch('/api/dashboard/workspace', { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error ?? t('workspace.couldNotDelete'))
      }
      const result = await authClient.organization.setActive({ organizationId: null })
      if (result.error) throw new Error(result.error.message)
      router.replace('/')
      router.refresh()
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : t('workspace.couldNotDelete'))
      setIsDeleting(false)
    }
  }

  return (
    <>
      <section className="settings-section-card" id="workspace-settings" aria-labelledby="workspace-details-title">
        <header className="settings-section-heading">
          <div>
            <h2 id="workspace-details-title">{t(organizationId ? 'workspace.settingsTitle' : 'settings.personalTitle')}</h2>
            <p>{t(organizationId ? 'workspace.settingsDescription' : 'settings.personalManageDescription')}</p>
          </div>
        </header>
        <form className="workspace-settings-form" onSubmit={save}>
          <Input
            autoComplete={organizationId ? 'organization' : 'off'}
            error={error ?? undefined}
            label={t('workspace.name')}
            maxLength={80}
            name="workspace-name"
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
              if (success) setSuccess(null)
            }}
            value={name}
          />
          <footer className="settings-form-actions">
            <p aria-live="polite" className="settings-form-status">{success}</p>
            <Button pending={isSubmitting} type="submit">{t('common.save')}</Button>
          </footer>
        </form>
        {organizationId && currentRole ? (
          <WorkspaceMembersPanel
            currentRole={currentRole}
            currentUserId={currentUserId}
            organizationId={organizationId}
          />
        ) : (
          <div className="workspace-personal-access">
            <strong>{t('workspace.personalAccessTitle')}</strong>
            <p>{t('workspace.personalAccessDescription')}</p>
          </div>
        )}
      </section>
      {organizationId ? (
        <section className="settings-section-card settings-danger-card" aria-labelledby="workspace-danger-title">
          <div>
            <h2 id="workspace-danger-title">{t('workspace.delete')}</h2>
            <p>{t('workspace.deleteDescription')}</p>
          </div>
          <Button onClick={() => setIsDeleteOpen(true)} type="button" variant="danger">
            {t('workspace.delete')}
          </Button>
        </section>
      ) : null}
      {organizationId && isDeleteOpen ? (
        <AlertDialog
          cancel={() => { if (!isDeleting) setIsDeleteOpen(false) }}
          cancelLabel={t('common.cancel')}
          closeLabel={t('common.close')}
          confirm={deleteWorkspace}
          confirmLabel={t('workspace.delete')}
          description={t('workspace.deleteConfirm', { name: initialName })}
          error={deleteError ?? undefined}
          pending={isDeleting}
          title={t('workspace.deleteTitle', { name: initialName })}
        />
      ) : null}
    </>
  )
}
