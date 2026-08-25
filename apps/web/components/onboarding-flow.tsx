'use client'

import { SignOutButton, useOrganization, useOrganizationList } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { JabsoWordmark } from '@/components/jabso-wordmark'
import { Button } from '@/components/ui/button'
import type { WorkspaceKind } from '@/lib/workspaces'

type OnboardingFlowProps = { hasActiveOrganization: boolean }

const workspaceOptions: Array<{ description: string; kind: WorkspaceKind; label: string }> = [
  { kind: 'personal', label: 'Personal', description: 'A private error inbox just for you.' },
  { kind: 'team', label: 'Team', description: 'Share projects with a small product team.' },
  { kind: 'organization', label: 'Organization', description: 'Manage multiple members under one workspace.' },
]

export const OnboardingFlow = ({ hasActiveOrganization }: OnboardingFlowProps) => {
  const router = useRouter()
  const { organization } = useOrganization()
  const { createOrganization, isLoaded, setActive } = useOrganizationList()
  const [kind, setKind] = useState<WorkspaceKind>(hasActiveOrganization ? 'team' : 'personal')
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState(organization?.name ?? '')
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
      setName(organization?.name ?? '')
      setStep(2)
      return
    }
    if (!isLoaded || !setActive) return
    setIsSubmitting(true)
    try {
      await setActive({ organization: null })
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
    if (!isLoaded || !setActive || !createOrganization) return
    setError(null)
    setIsSubmitting(true)
    try {
      let activeOrganization = organization
      if (!activeOrganization) {
        activeOrganization = await createOrganization({ name: workspaceName })
        await setActive({ organization: activeOrganization.id })
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
                <button
                  aria-checked={kind === option.kind}
                  className={`workspace-option ${kind === option.kind ? 'workspace-option-selected' : ''}`}
                  key={option.kind}
                  onClick={() => setKind(option.kind)}
                  role="radio"
                  type="button"
                >
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  <span className="workspace-radio" aria-hidden="true" />
                </button>
              ))}
            </div>
            {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
            <footer className="onboarding-actions">
              <SignOutButton redirectUrl="/sign-in">
                <button className="onboarding-sign-out" type="button">Sign out</button>
              </SignOutButton>
              <Button disabled={isSubmitting || !isLoaded} onClick={continueFromChoice}>
                {isSubmitting ? 'Creating…' : 'Continue'}
              </Button>
            </footer>
          </>
        ) : (
          <>
            <h1 id="onboarding-title">Name your {kind === 'team' ? 'team' : 'organization'}</h1>
            <p className="onboarding-copy">This name appears in the workspace switcher.</p>
            <label className={`onboarding-field ${error ? 'onboarding-field-error' : ''}`}>
              <span>{kind === 'team' ? 'Team name' : 'Organization name'}</span>
              <input
                autoFocus
                aria-describedby={error ? 'workspace-name-error' : undefined}
                aria-invalid={Boolean(error)}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder={kind === 'team' ? 'Acme engineering' : 'Acme, Inc.'}
                value={name}
              />
            </label>
            {error ? <p className="onboarding-error" id="workspace-name-error" role="alert">{error}</p> : null}
            <p className="onboarding-hint">You can invite members after setup.</p>
            <footer className="onboarding-actions">
              <Button onClick={() => { setError(null); setStep(1) }} variant="ghost">Back</Button>
              <Button disabled={isSubmitting || !isLoaded} onClick={createSharedWorkspace}>
                {isSubmitting ? 'Creating…' : `Create ${kind}`}
              </Button>
            </footer>
          </>
        )}
      </section>
    </main>
  )
}
