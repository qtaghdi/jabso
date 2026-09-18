'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { authClient } from 'src/shared/auth/auth-client'
import { getAuthErrorMessage } from 'src/shared/auth/auth-client-error'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { AlertDialog } from 'src/shared/ui/alert-dialog'
import { Button } from 'src/shared/ui/button'
import { Input } from 'src/shared/ui/input'
import { Select } from 'src/shared/ui/select'

type WorkspaceMemberRole = 'admin' | 'member' | 'owner'

type WorkspaceMember = {
  id: string
  role: WorkspaceMemberRole
  user: {
    email: string
    id: string
    image?: string | null
    name: string
  }
  userId: string
}

type WorkspaceInvitation = {
  email: string
  id: string
  role: WorkspaceMemberRole
  status: string
}

type WorkspaceMembersPanelProps = {
  currentRole: 'admin' | 'owner'
  currentUserId: string
  organizationId: string
}

const getInitials = (name: string, email: string) => (name || email)
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.slice(0, 1).toUpperCase())
  .join('') || 'J'

export const WorkspaceMembersPanel = ({
  currentRole,
  currentUserId,
  organizationId,
}: WorkspaceMembersPanelProps) => {
  const { t } = useI18n()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)

  const loadAccess = useCallback(async () => {
    setError(null)
    const [membersResult, invitationsResult] = await Promise.all([
      authClient.organization.listMembers({ query: { limit: 100, organizationId } }),
      authClient.organization.listInvitations({ query: { organizationId } }),
    ])
    if (membersResult.error || invitationsResult.error) {
      setError(getAuthErrorMessage(membersResult.error ?? invitationsResult.error, t('workspace.couldNotLoadAccess')))
      setIsLoading(false)
      return
    }
    setMembers(membersResult.data.members as WorkspaceMember[])
    setInvitations((invitationsResult.data as WorkspaceInvitation[]).filter((invitation) => invitation.status === 'pending'))
    setIsLoading(false)
  }, [organizationId, t])

  useEffect(() => {
    void loadAccess()
  }, [loadAccess])

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError(t('workspace.enterEmail'))
      return
    }
    setError(null)
    setPendingAction('invite')
    const result = await authClient.organization.inviteMember({
      email: normalizedEmail,
      organizationId,
      role: inviteRole,
    })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('workspace.couldNotSendInvitation')))
      setPendingAction(null)
      return
    }
    setEmail('')
    await loadAccess()
    setPendingAction(null)
  }

  const updateRole = async (member: WorkspaceMember, role: 'admin' | 'member') => {
    if (member.role === role || pendingAction) return
    setError(null)
    setPendingAction(`role:${member.id}`)
    const result = await authClient.organization.updateMemberRole({
      memberId: member.id,
      organizationId,
      role,
    })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('workspace.couldNotUpdateRole')))
    } else {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role } : item))
    }
    setPendingAction(null)
  }

  const removeMember = async () => {
    if (!removeTarget || pendingAction) return
    setError(null)
    setPendingAction(`remove:${removeTarget.id}`)
    const result = await authClient.organization.removeMember({
      memberIdOrEmail: removeTarget.id,
      organizationId,
    })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('workspace.couldNotRemoveMember')))
      setPendingAction(null)
      return
    }
    setMembers((current) => current.filter((member) => member.id !== removeTarget.id))
    setRemoveTarget(null)
    setPendingAction(null)
  }

  const cancelInvitation = async (invitation: WorkspaceInvitation) => {
    if (pendingAction) return
    setError(null)
    setPendingAction(`cancel:${invitation.id}`)
    const result = await authClient.organization.cancelInvitation({ invitationId: invitation.id })
    if (result.error) {
      setError(getAuthErrorMessage(result.error, t('workspace.couldNotCancelInvitation')))
    } else {
      setInvitations((current) => current.filter((item) => item.id !== invitation.id))
    }
    setPendingAction(null)
  }

  const canManageMember = (member: WorkspaceMember) => {
    if (member.userId === currentUserId || member.role === 'owner') return false
    return currentRole === 'owner' || member.role === 'member'
  }

  return (
    <section className="workspace-access-section">
      <header className="workspace-settings-section-heading">
        <div><strong>{t('workspace.members')}</strong><p>{t('workspace.membersDescription')}</p></div>
        {!isLoading ? <span>{members.length}</span> : null}
      </header>

      <form className="workspace-invite-form" onSubmit={invite}>
        <Input
          autoComplete="email"
          label={t('workspace.email')}
          name="member-email"
          onChange={(event) => { setEmail(event.target.value); setError(null) }}
          placeholder="teammate@example.com"
          type="email"
          value={email}
        />
        <Select
          controlSize="md"
          disabled={pendingAction === 'invite'}
          label={t('workspace.role')}
          onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
          value={inviteRole}
        >
          <option value="member">{t('common.member')}</option>
          {currentRole === 'owner' ? <option value="admin">{t('common.admin')}</option> : null}
        </Select>
        <Button pending={pendingAction === 'invite'} type="submit">{t('workspace.invite')}</Button>
      </form>

      {error ? <p className="form-error workspace-access-error" role="alert">{error}</p> : null}
      {isLoading ? (
        <div aria-label={t('workspace.loadingMembers')} className="workspace-member-loading">
          <span /><span /><span />
        </div>
      ) : (
        <div className="workspace-member-list">
          {members.map((member) => {
            const canManage = canManageMember(member)
            const isRolePending = pendingAction === `role:${member.id}`
            return (
              <div className="workspace-member-row" key={member.id}>
                <span className="workspace-member-avatar" aria-hidden="true">{getInitials(member.user.name, member.user.email)}</span>
                <span className="workspace-member-identity">
                  <strong>{member.user.name || member.user.email}{member.userId === currentUserId ? ` (${t('workspace.you')})` : ''}</strong>
                  <small>{member.user.email}</small>
                </span>
                {member.role === 'owner' ? (
                  <span className="workspace-role-label">{t('common.owner')}</span>
                ) : (
                  <Select
                    className="workspace-role-select"
                    controlSize="sm"
                    disabled={!canManage || isRolePending}
                    hideLabel
                    label={t('workspace.roleFor', { name: member.user.name || member.user.email })}
                    onChange={(event) => void updateRole(member, event.target.value as 'admin' | 'member')}
                    value={member.role}
                  >
                    <option value="member">{t('common.member')}</option>
                    {currentRole === 'owner' || member.role === 'admin' ? <option value="admin">{t('common.admin')}</option> : null}
                  </Select>
                )}
                <Button
                  className="workspace-member-remove"
                  disabled={!canManage || Boolean(pendingAction)}
                  onClick={() => setRemoveTarget(member)}
                  type="button"
                  variant="ghost"
                >
                  {t('workspace.remove')}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {invitations.length > 0 ? (
        <div className="workspace-invitation-list">
          <strong>{t('workspace.pendingInvitations')}</strong>
          {invitations.map((invitation) => (
            <div className="workspace-invitation-row" key={invitation.id}>
              <span><strong>{invitation.email}</strong><small>{invitation.role === 'admin' ? t('common.admin') : t('common.member')}</small></span>
              <Button
                disabled={Boolean(pendingAction)}
                onClick={() => void cancelInvitation(invitation)}
                pending={pendingAction === `cancel:${invitation.id}`}
                type="button"
                variant="ghost"
              >
                {t('workspace.cancelInvite')}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {removeTarget ? createPortal(
        <AlertDialog
          cancel={() => { if (!pendingAction) setRemoveTarget(null) }}
          confirm={removeMember}
          confirmLabel={t('workspace.removeMember')}
          description={t('workspace.removeConfirm', { name: removeTarget.user.name || removeTarget.user.email })}
          pending={pendingAction === `remove:${removeTarget.id}`}
          title={t('workspace.removeTitle')}
        />,
        document.body,
      ) : null}
    </section>
  )
}
