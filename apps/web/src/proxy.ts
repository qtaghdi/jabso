import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith('/sign-in')
    || request.nextUrl.pathname.startsWith('/sign-up')) return

  const { userId } = await auth()
  const hasStaleSession = !userId && request.cookies.has('__session')

  if (hasStaleSession) {
    return NextResponse.redirect(new URL('/sign-in?reason=session-expired', request.url))
  }

  await auth.protect({ unauthenticatedUrl: new URL('/sign-in', request.url).toString() })
}, { signInUrl: '/sign-in' })

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
