'use server'

import { cookies } from 'next/headers'
import { requireOwner } from '@/lib/auth'

export const setSidebarCollapsed = async (collapsed: boolean) => {
  await requireOwner()
  if (typeof collapsed !== 'boolean') throw new Error('Invalid sidebar preference')
  const cookieStore = await cookies()
  cookieStore.set('jabso-sidebar', collapsed ? 'collapsed' : 'expanded', {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
