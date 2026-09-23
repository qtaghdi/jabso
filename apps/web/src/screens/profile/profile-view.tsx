'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { Button } from 'src/shared/ui/button'
import { dashboardPageHeaderClass, dashboardSurfaceClass } from 'src/shared/ui/dashboard-styles'
import { Input } from 'src/shared/ui/input'

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'J'

export const ProfileView = () => {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (session?.user.name) setName(session.user.name)
  }, [session?.user.name])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      setError(t('profile.nameRequired'))
      return
    }

    setError(null)
    setSuccess(null)
    setIsSaving(true)
    try {
      const result = await authClient.updateUser({ name: nextName })
      if (result.error) throw new Error(result.error.message)
      setName(nextName)
      setSuccess(t('profile.saved'))
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('profile.updateError'))
    } finally {
      setIsSaving(false)
    }
  }

  const signOut = async () => {
    setIsSigningOut(true)
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  if (isPending) {
    return <div className="grid max-w-4xl gap-4" role="status">
      <span className="skeleton-block h-16 w-64" />
      <span className="skeleton-block h-72 rounded-2xl" />
      <span className="sr-only">{t('profile.loading')}</span>
    </div>
  }

  if (!session) {
    return <div className="route-state" role="alert"><h1>{t('profile.unavailable')}</h1><p>{t('auth.sessionExpiredDescription')}</p></div>
  }

  const displayName = session.user.name || session.user.email || t('common.user')

  return (
    <>
      <header className={`${dashboardPageHeaderClass} max-w-[760px]`}>
        <h1>{t('profile.title')}</h1>
        <p>{t('profile.description')}</p>
      </header>
      <div className="grid max-w-4xl gap-4">
        <section className={`${dashboardSurfaceClass} grid gap-6 p-6 max-[620px]:p-5`} aria-labelledby="profile-account-title">
          <header className="flex items-start gap-4 max-[620px]:items-center">
            <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-base font-bold text-white">{initials(displayName)}</span>
            <div className="min-w-0">
              <h2 className="m-0 text-lg tracking-[-0.025em]" id="profile-account-title">{t('profile.accountTitle')}</h2>
              <p className="mt-1.5 mb-0 text-xs leading-relaxed text-muted text-pretty">{t('profile.accountDescription')}</p>
            </div>
          </header>
          <form className="grid max-w-xl gap-5" onSubmit={save}>
            <Input
              autoComplete="name"
              error={error ?? undefined}
              hint={t('profile.nameHint')}
              label={t('profile.name')}
              maxLength={80}
              name="profile-name"
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError(null)
                if (success) setSuccess(null)
              }}
              value={name}
            />
            <div className="grid gap-2">
              <span className="text-xs font-semibold text-[#3f4650]">{t('profile.email')}</span>
              <div className="rounded-lg border border-line bg-subtle px-3.5 py-3 text-[13px] text-ink break-all">{session.user.email}</div>
              <small className="text-[11px] leading-snug text-muted">{t('profile.emailDescription')}</small>
            </div>
            <footer className="flex min-h-10 items-center justify-between gap-4 max-[520px]:items-stretch max-[520px]:flex-col-reverse">
              <p aria-live="polite" className="m-0 text-xs text-success">{success}</p>
              <Button pending={isSaving} type="submit">{t('common.save')}</Button>
            </footer>
          </form>
        </section>
        <section className={`${dashboardSurfaceClass} flex items-center justify-between gap-6 p-6 max-[620px]:grid max-[620px]:p-5`} aria-labelledby="profile-security-title">
          <div>
            <h2 className="m-0 text-base tracking-[-0.02em]" id="profile-security-title">{t('profile.securityTitle')}</h2>
            <p className="mt-1.5 mb-0 max-w-xl text-xs leading-relaxed text-muted text-pretty">{t('profile.securityDescription')}</p>
          </div>
          <Button className="max-[620px]:w-full" onClick={signOut} pending={isSigningOut} type="button" variant="secondary">
            {t('profile.signOut')}
          </Button>
        </section>
      </div>
    </>
  )
}
