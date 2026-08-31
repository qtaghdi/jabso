import { NextResponse } from 'next/server'
import { listGitHubInstallations, startGitHubInstallation } from 'src/shared/api/github'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'

export const GET = async () => {
  await requireWorkspace()
  return NextResponse.json(await listGitHubInstallations())
}

export const POST = async () => {
  const workspace = await requireWorkspace()
  if (!workspace.canManage) {
    return NextResponse.json({ error: 'administrator role required' }, { status: 403 })
  }
  try {
    return NextResponse.json(await startGitHubInstallation(), { status: 201 })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'GitHub installation is temporarily unavailable.',
    }, { status: 502 })
  }
}
