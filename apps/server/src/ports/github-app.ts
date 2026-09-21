export type GitHubInstallationAccountType = 'Organization' | 'User'
export type GitHubRepositorySelection = 'all' | 'selected'

export type GitHubInstallation = {
  accountId: string
  accountLogin: string
  accountType: GitHubInstallationAccountType
  installationId: string
  repositorySelection: GitHubRepositorySelection
  suspendedAt: string | null
}

export type GitHubRepository = {
  archived: boolean
  defaultBranch: string
  externalId: string
  installationId: string
  name: string
  owner: string
  private: boolean
  updatedAt: string
  url: string
}

export type GitHubInstallationRequest = {
  accountId: string
  requestId: string
  requesterId: string
}

export type GitHubAppClient = {
  authorizeInstallation(code: string, installationId: string): Promise<GitHubInstallation>
  authorizeInstallationRequest(code: string): Promise<GitHubInstallationRequest | null>
  listRepositories(installationId: string): Promise<GitHubRepository[]>
}

export type GitHubInstallationStore = {
  claimInstallation(claimHash: string, workspaceId: string): Promise<boolean>
  connectRequestedInstallation(requesterId: string, installation: GitHubInstallation): Promise<boolean>
  consumeState(stateHash: string): Promise<{ workspaceId: string } | null>
  createClaim(input: { claimHash: string; expiresAt: string; installation: GitHubInstallation }): Promise<void>
  createInstallationRequest(input: GitHubInstallationRequest & { expiresAt: string; workspaceId: string }): Promise<boolean>
  createState(input: { expiresAt: string; stateHash: string; workspaceId: string }): Promise<void>
  deleteInstallation(installationId: string): Promise<void>
  listInstallations(workspaceId: string): Promise<GitHubInstallation[]>
  updateInstallation(installation: GitHubInstallation): Promise<void>
  upsertInstallation(workspaceId: string, installation: GitHubInstallation): Promise<boolean>
}
