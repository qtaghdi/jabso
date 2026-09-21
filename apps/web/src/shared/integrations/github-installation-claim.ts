export const githubInstallationClaimCookie = 'jabso-github-installation-claim'

export const isGitHubInstallationClaim = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
