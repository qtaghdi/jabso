import { getSessionCookie } from 'better-auth/cookies'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const publicPaths = ['/sign-in', '/sign-up', '/api/auth']

const proxy = (request: NextRequest) => {
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) return NextResponse.next()
  if (getSessionCookie(request)) return NextResponse.next()
  return NextResponse.redirect(new URL('/sign-in', request.url))
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
