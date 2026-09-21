import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { claimGitHubInstallation } from 'src/shared/api/github'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import {
  githubInstallationClaimCookie,
  isGitHubInstallationClaim,
} from 'src/shared/integrations/github-installation-claim'

export const POST = async () => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) {
    return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 })
  }
  const cookieStore = await cookies()
  const claim = cookieStore.get(githubInstallationClaimCookie)?.value
  if (!isGitHubInstallationClaim(claim)) {
    return NextResponse.json({ error: 'This GitHub connection has expired.' }, { status: 409 })
  }
  try {
    await claimGitHubInstallation(claim)
    cookieStore.delete(githubInstallationClaimCookie)
    return NextResponse.json({ connected: true })
  } catch (error) {
    cookieStore.delete(githubInstallationClaimCookie)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not connect the GitHub installation.',
    }, { status: 409 })
  }
}
