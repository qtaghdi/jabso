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
    <div aria-label={t('i18n.language')} className="language-switcher" role="group">
      {(['en', 'ko'] as const).map((option) => (
        <button
          aria-pressed={locale === option}
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
