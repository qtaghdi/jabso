'use server'

import { cookies } from 'next/headers'
import { isLocale, localeCookieName } from 'src/shared/i18n/locale'

export const setLocalePreference = async (locale: string) => {
  if (!isLocale(locale)) return
  (await cookies()).set(localeCookieName, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
