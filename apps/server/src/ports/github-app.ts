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

export type GitHubAppClient = {
  authorizeInstallation(code: string, installationId: string): Promise<GitHubInstallation>
  listRepositories(installationId: string): Promise<GitHubRepository[]>
}

export type GitHubInstallationStore = {
  consumeState(stateHash: string): Promise<{ workspaceId: string } | null>
  createState(input: { expiresAt: string; stateHash: string; workspaceId: string }): Promise<void>
  deleteInstallation(installationId: string): Promise<void>
  listInstallations(workspaceId: string): Promise<GitHubInstallation[]>
  updateInstallation(installation: GitHubInstallation): Promise<void>
  upsertInstallation(workspaceId: string, installation: GitHubInstallation): Promise<boolean>
}
