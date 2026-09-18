import 'server-only'

import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { translate, type Locale } from 'src/shared/i18n/messages'

export const localeCookieName = 'jabso-locale'

export const isLocale = (value: string | undefined): value is Locale => value === 'en' || value === 'ko'

const localeFromAcceptLanguage = (value: string): Locale => {
  const preferences = value.split(',').map((item, index) => {
    const [language = '', ...parameters] = item.trim().toLowerCase().split(';')
    const quality = parameters.find((parameter) => parameter.trim().startsWith('q='))?.split('=')[1]
    return { index, language, quality: quality === undefined ? 1 : Number(quality) || 0 }
  }).sort((left, right) => right.quality - left.quality || left.index - right.index)

  for (const preference of preferences) {
    if (preference.language === 'ko' || preference.language.startsWith('ko-')) return 'ko'
    if (preference.language === 'en' || preference.language.startsWith('en-')) return 'en'
  }
  return 'en'
}

export const getLocale = cache(async (): Promise<Locale> => {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value
  if (isLocale(cookieLocale)) return cookieLocale
  return localeFromAcceptLanguage((await headers()).get('accept-language') ?? '')
})

export const getI18n = cache(async () => {
  const locale = await getLocale()
  return { locale, t: translate.bind(null, locale) }
})
