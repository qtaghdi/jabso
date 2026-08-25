import { NextResponse } from 'next/server'
import { GitHubConnectionError, listGitHubRepositories } from '@/lib/github'

export const GET = async () => {
  try {
    return NextResponse.json({ items: await listGitHubRepositories() })
  } catch (error) {
    if (error instanceof GitHubConnectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}
