import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { QueryProvider } from 'src/shared/providers/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Jabso Issues', template: '%s · Jabso' },
  description: 'A personal error inbox for application failures.',
}

type RootLayoutProps = { children: ReactNode }

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en"><body><ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up"><QueryProvider>{children}</QueryProvider></ClerkProvider></body></html>
)

export default RootLayout
