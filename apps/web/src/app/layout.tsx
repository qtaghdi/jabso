import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BoundraDevErrorView } from 'src/shared/boundra/boundra-dev-error-view'
import { I18nProvider } from 'src/shared/i18n/i18n-provider'
import { getLocale } from 'src/shared/i18n/locale'
import { QueryProvider } from 'src/shared/providers/query-provider'
import './globals.css'

export const generateMetadata = async (): Promise<Metadata> => (await getLocale()) === 'ko'
  ? {
      title: { default: 'Jabso 이슈', template: '%s · Jabso' },
      description: '애플리케이션 오류를 위한 개인 이슈 보관함입니다.',
    }
  : {
      title: { default: 'Jabso Issues', template: '%s · Jabso' },
      description: 'A personal error inbox for application failures.',
    }

type RootLayoutProps = { children: ReactNode }

const RootLayout = async ({ children }: RootLayoutProps) => {
  const locale = await getLocale()
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}><QueryProvider>{children}</QueryProvider></I18nProvider>
        <BoundraDevErrorView />
      </body>
    </html>
  )
}

export default RootLayout
