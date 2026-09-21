import { getSessionCookie } from 'better-auth/cookies'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const publicPaths = ['/accept-invitation', '/sign-in', '/sign-up', '/verify-email', '/forgot-password', '/reset-password', '/github/connect', '/api/auth', '/api/github/connect']

const proxy = (request: NextRequest) => {
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) return NextResponse.next()
  if (getSessionCookie(request)) return NextResponse.next()
  const signInUrl = new URL('/sign-in', request.url)
  signInUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(signInUrl)
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
