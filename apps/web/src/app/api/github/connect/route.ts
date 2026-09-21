import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  githubInstallationClaimCookie,
  isGitHubInstallationClaim,
} from 'src/shared/integrations/github-installation-claim'

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null) as { claim?: unknown } | null
  if (!isGitHubInstallationClaim(body?.claim)) {
    return NextResponse.json({ error: 'Invalid GitHub installation claim.' }, { status: 400 })
  }
  const cookieStore = await cookies()
  cookieStore.set(githubInstallationClaimCookie, body.claim, {
    httpOnly: true,
    maxAge: 15 * 60,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return NextResponse.json({ stored: true })
}
