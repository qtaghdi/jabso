import { NextResponse } from 'next/server'
import { listGitHubRepositories } from 'src/shared/api/github'

export const GET = async () => {
  try {
    return NextResponse.json(await listGitHubRepositories())
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'GitHub repositories are temporarily unavailable.',
    }, { status: 502 })
  }
}
