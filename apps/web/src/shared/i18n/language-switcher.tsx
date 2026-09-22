'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { setLocalePreference } from 'src/shared/i18n/locale-actions'
import type { Locale } from 'src/shared/i18n/messages'

export const LanguageSwitcher = () => {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const selectLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) return
    startTransition(async () => {
      await setLocalePreference(nextLocale)
      router.refresh()
    })
  }

  return (
    <div aria-label={t('i18n.language')} className="inline-flex w-fit rounded-xl border border-line bg-subtle p-1" role="group">
      {(['en', 'ko'] as const).map((option) => (
        <button
          aria-pressed={locale === option}
          className="min-h-9 cursor-pointer rounded-lg border-0 bg-transparent px-3.5 text-xs font-semibold text-muted hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus/30 aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-sm disabled:cursor-default disabled:opacity-60"
          disabled={isPending}
          key={option}
          onClick={() => selectLocale(option)}
          type="button"
        >
          {t(option === 'en' ? 'i18n.english' : 'i18n.korean')}
        </button>
      ))}
    </div>
  )
}
