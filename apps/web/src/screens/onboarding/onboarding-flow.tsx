'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OnboardingLoading } from 'src/screens/onboarding/onboarding-loading'
import type { WorkspaceKind } from 'src/shared/api/workspaces'
import { authClient } from 'src/shared/auth/auth-client'
import { JabsoWordmark } from 'src/shared/brand/jabso-wordmark'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'

type OnboardingFlowProps = { hasActiveOrganization: boolean; redirectTo?: string }

const workspaceSlug = (name: string) => {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace'
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export const OnboardingFlow = ({ hasActiveOrganization, redirectTo = '/' }: OnboardingFlowProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { data: activeOrganization, isPending: isOrganizationPending } = authClient.useActiveOrganization()
  const [kind, setKind] = useState<WorkspaceKind>(hasActiveOrganization ? 'team' : 'personal')
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState(activeOrganization?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const workspaceOptions: Array<{ description: string; kind: WorkspaceKind; label: string }> = [
    { kind: 'personal', label: t('common.personal'), description: t('onboarding.personalDescription') },
    { kind: 'team', label: t('workspace.typeTeam'), description: t('onboarding.teamDescription') },
    { kind: 'organization', label: t('workspace.typeOrganization'), description: t('onboarding.organizationDescription') },
  ]

  const provision = async (selectedKind: WorkspaceKind, workspaceName = '') => {
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: selectedKind, name: workspaceName }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(result?.error ?? t('workspace.createError'))
    }
  }

  const continueFromChoice = async () => {
    setError(null)
    if (kind !== 'personal') {
      setName(activeOrganization?.name ?? '')
      setStep(2)
      return
    }
    setIsSubmitting(true)
    try {
      const result = await authClient.organization.setActive({ organizationId: null })
      if (result.error) throw new Error(result.error.message)
      await provision('personal')
      window.location.replace(redirectTo)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('workspace.createError'))
      setIsSubmitting(false)
    }
  }

  const createSharedWorkspace = async () => {
    const workspaceName = name.trim()
    if (!workspaceName) {
      setError(t(kind === 'team' ? 'onboarding.enterTeam' : 'onboarding.enterOrganization'))
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      let organizationId = activeOrganization?.id
      if (!organizationId) {
        const created = await authClient.organization.create({ name: workspaceName, slug: workspaceSlug(workspaceName) })
        if (created.error || !created.data) throw new Error(created.error?.message ?? t('workspace.createError'))
        organizationId = created.data.id
        const activated = await authClient.organization.setActive({ organizationId })
        if (activated.error) throw new Error(activated.error.message)
      }
      await provision(kind, workspaceName)
      window.location.replace(redirectTo)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('workspace.createError'))
      setIsSubmitting(false)
    }
  }

  const signOut = async () => {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  if (isOrganizationPending || isSubmitting) {
    return (
      <main className="onboarding-page">
        <header className="onboarding-brand"><JabsoWordmark /></header>
        <div className="onboarding-card"><OnboardingLoading description={isSubmitting ? t('onboarding.creating') : undefined} /></div>
      </main>
    )
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-brand"><JabsoWordmark /></header>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="onboarding-step">{t('onboarding.step', { step })}</p>
        {step === 1 ? (
          <>
            <h1 id="onboarding-title">{t('onboarding.chooseTitle')}</h1>
            <p className="onboarding-copy">{t('onboarding.chooseDescription')}</p>
            <div className="workspace-options" role="radiogroup" aria-label={t('workspace.type')}>
              {workspaceOptions.map((option) => (
                <button aria-checked={kind === option.kind} className={`workspace-option ${kind === option.kind ? 'workspace-option-selected' : ''}`} key={option.kind} onClick={() => setKind(option.kind)} role="radio" type="button">
                  <span><strong>{option.label}</strong><small>{option.description}</small></span><span className="workspace-radio" aria-hidden="true" />
                </button>
              ))}
            </div>
            {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
            <footer className="onboarding-actions"><button className="onboarding-sign-out" onClick={signOut} type="button">{t('onboarding.signOut')}</button><Button onClick={continueFromChoice}>{t('onboarding.continue')}</Button></footer>
          </>
        ) : (
          <>
            <h1 id="onboarding-title">{t(kind === 'team' ? 'onboarding.nameTeam' : 'onboarding.nameOrganization')}</h1>
            <p className="onboarding-copy">{t('onboarding.nameDescription')}</p>
            <label className={`onboarding-field ${error ? 'onboarding-field-error' : ''}`}>
              <span>{t(kind === 'team' ? 'onboarding.teamName' : 'onboarding.organizationName')}</span>
              <input aria-describedby={error ? 'workspace-name-error' : undefined} aria-invalid={Boolean(error)} autoComplete="organization" maxLength={80} name="workspace-name" onChange={(event) => setName(event.target.value)} placeholder={kind === 'team' ? 'Acme engineering' : 'Acme, Inc.'} value={name} />
            </label>
            {error ? <p className="onboarding-error" id="workspace-name-error" role="alert">{error}</p> : null}
            <p className="onboarding-hint">{t('onboarding.inviteLater')}</p>
            <footer className="onboarding-actions"><Button onClick={() => { setError(null); setStep(1) }} variant="ghost">{t('onboarding.back')}</Button><Button onClick={createSharedWorkspace}>{t('onboarding.create', { type: kind === 'team' ? t('workspace.typeTeam') : t('workspace.typeOrganization') })}</Button></footer>
          </>
        )}
      </section>
    </main>
  )
}
