'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { translate, type Locale, type MessageKey, type MessageValues } from 'src/shared/i18n/messages'

type I18nContextValue = {
  locale: Locale
  t: (key: MessageKey, values?: MessageValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export const I18nProvider = ({ children, locale }: { children: ReactNode; locale: Locale }) => {
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    t: (key, values) => translate(locale, key, values),
  }), [locale])
  return <I18nContext value={value}>{children}</I18nContext>
}

export const useI18n = () => {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within I18nProvider')
  return value
}
