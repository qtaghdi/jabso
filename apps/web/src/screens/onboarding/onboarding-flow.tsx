'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OnboardingLoading } from 'src/screens/onboarding/onboarding-loading'
import type { WorkspaceKind } from 'src/shared/api/workspaces'
import { authClient } from 'src/shared/auth/auth-client'
import { JabsoWordmark } from 'src/shared/brand/jabso-wordmark'
import { Button } from 'src/shared/ui/button'

type OnboardingFlowProps = { hasActiveOrganization: boolean }

const workspaceOptions: Array<{ description: string; kind: WorkspaceKind; label: string }> = [
  { kind: 'personal', label: 'Personal', description: 'A private error inbox just for you.' },
  { kind: 'team', label: 'Team', description: 'Share projects with a small product team.' },
  { kind: 'organization', label: 'Organization', description: 'Manage multiple members under one workspace.' },
]

const workspaceSlug = (name: string) => {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace'
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export const OnboardingFlow = ({ hasActiveOrganization }: OnboardingFlowProps) => {
  const router = useRouter()
  const { data: activeOrganization, isPending: isOrganizationPending } = authClient.useActiveOrganization()
  const [kind, setKind] = useState<WorkspaceKind>(hasActiveOrganization ? 'team' : 'personal')
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState(activeOrganization?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const provision = async (selectedKind: WorkspaceKind, workspaceName = '') => {
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: selectedKind, name: workspaceName }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(result?.error ?? 'Could not create the workspace')
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
      router.replace('/')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  const createSharedWorkspace = async () => {
    const workspaceName = name.trim()
    if (!workspaceName) {
      setError(`Enter a ${kind === 'team' ? 'team' : 'organization'} name`)
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      let organizationId = activeOrganization?.id
      if (!organizationId) {
        const created = await authClient.organization.create({ name: workspaceName, slug: workspaceSlug(workspaceName) })
        if (created.error || !created.data) throw new Error(created.error?.message ?? 'Could not create the workspace')
        organizationId = created.data.id
        const activated = await authClient.organization.setActive({ organizationId })
        if (activated.error) throw new Error(activated.error.message)
      }
      await provision(kind, workspaceName)
      router.replace('/')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the workspace')
    } finally {
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
        <div className="onboarding-card"><OnboardingLoading description={isSubmitting ? 'Creating the workspace and connecting it to your account.' : undefined} /></div>
      </main>
    )
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-brand"><JabsoWordmark /></header>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="onboarding-step">Step {step} of 2</p>
        {step === 1 ? (
          <>
            <h1 id="onboarding-title">Choose a workspace</h1>
            <p className="onboarding-copy">Decide who can see projects and errors. You can switch workspaces later.</p>
            <div className="workspace-options" role="radiogroup" aria-label="Workspace type">
              {workspaceOptions.map((option) => (
                <button aria-checked={kind === option.kind} className={`workspace-option ${kind === option.kind ? 'workspace-option-selected' : ''}`} key={option.kind} onClick={() => setKind(option.kind)} role="radio" type="button">
                  <span><strong>{option.label}</strong><small>{option.description}</small></span><span className="workspace-radio" aria-hidden="true" />
                </button>
              ))}
            </div>
            {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
            <footer className="onboarding-actions"><button className="onboarding-sign-out" onClick={signOut} type="button">Sign out</button><Button onClick={continueFromChoice}>Continue</Button></footer>
          </>
        ) : (
          <>
            <h1 id="onboarding-title">Name your {kind === 'team' ? 'team' : 'organization'}</h1>
            <p className="onboarding-copy">This name appears in the workspace switcher.</p>
            <label className={`onboarding-field ${error ? 'onboarding-field-error' : ''}`}>
              <span>{kind === 'team' ? 'Team name' : 'Organization name'}</span>
              <input autoFocus aria-describedby={error ? 'workspace-name-error' : undefined} aria-invalid={Boolean(error)} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder={kind === 'team' ? 'Acme engineering' : 'Acme, Inc.'} value={name} />
            </label>
            {error ? <p className="onboarding-error" id="workspace-name-error" role="alert">{error}</p> : null}
            <p className="onboarding-hint">You can invite members after setup.</p>
            <footer className="onboarding-actions"><Button onClick={() => { setError(null); setStep(1) }} variant="ghost">Back</Button><Button onClick={createSharedWorkspace}>{`Create ${kind}`}</Button></footer>
          </>
        )}
      </section>
    </main>
  )
}
