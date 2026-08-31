import type { SqlExecutor } from '@jabso/db'
import type {
  GitHubInstallation,
  GitHubInstallationAccountType,
  GitHubInstallationStore,
  GitHubRepositorySelection,
} from '../../ports/github-app.js'

type Timestamp = Date | string

type InstallationRow = {
  account_id: string
  account_login: string
  account_type: GitHubInstallationAccountType
  installation_id: string
  repository_selection: GitHubRepositorySelection
  suspended_at: Timestamp | null
}

const installationFromRow = (row: InstallationRow): GitHubInstallation => ({
  accountId: row.account_id,
  accountLogin: row.account_login,
  accountType: row.account_type,
  installationId: row.installation_id,
  repositorySelection: row.repository_selection,
  suspendedAt: row.suspended_at ? new Date(row.suspended_at).toISOString() : null,
})

export class PostgresGitHubInstallationStore implements GitHubInstallationStore {
  constructor(private readonly database: SqlExecutor) {}

  async createState(input: { expiresAt: string; stateHash: string; workspaceId: string }) {
    await this.database.transaction(async (transaction) => {
      await transaction.query('delete from github_installation_states where expires_at <= now()')
      await transaction.query(
        `insert into github_installation_states (state_hash, workspace_id, expires_at)
         values ($1, $2, $3)`,
        [input.stateHash, input.workspaceId, input.expiresAt],
      )
    })
  }

  async consumeState(stateHash: string) {
    const result = await this.database.query<{ workspace_id: string }>(
      `delete from github_installation_states
       where state_hash = $1 and expires_at > now()
       returning workspace_id`,
      [stateHash],
    )
    const state = result.rows[0]
    return state ? { workspaceId: state.workspace_id } : null
  }

  async upsertInstallation(workspaceId: string, installation: GitHubInstallation) {
    const result = await this.database.query<{ installation_id: string }>(
      `insert into github_installations
        (workspace_id, installation_id, account_id, account_login, account_type,
         repository_selection, suspended_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (installation_id) do update set
         account_id = excluded.account_id,
         account_login = excluded.account_login,
         account_type = excluded.account_type,
         repository_selection = excluded.repository_selection,
         suspended_at = excluded.suspended_at,
         updated_at = now()
       where github_installations.workspace_id = excluded.workspace_id
       returning installation_id`,
      [
        workspaceId,
        installation.installationId,
        installation.accountId,
        installation.accountLogin,
        installation.accountType,
        installation.repositorySelection,
        installation.suspendedAt,
      ],
    )
    return Boolean(result.rows[0])
  }

  async listInstallations(workspaceId: string) {
    const result = await this.database.query<InstallationRow>(
      `select installation_id, account_id, account_login, account_type,
        repository_selection, suspended_at
       from github_installations
       where workspace_id = $1
       order by account_login, installation_id
       limit 20`,
      [workspaceId],
    )
    return result.rows.map(installationFromRow)
  }

  async updateInstallation(installation: GitHubInstallation) {
    await this.database.query(
      `update github_installations set
        account_id = $2,
        account_login = $3,
        account_type = $4,
        repository_selection = $5,
        suspended_at = $6,
        updated_at = now()
       where installation_id = $1`,
      [
        installation.installationId,
        installation.accountId,
        installation.accountLogin,
        installation.accountType,
        installation.repositorySelection,
        installation.suspendedAt,
      ],
    )
  }

  async deleteInstallation(installationId: string) {
    await this.database.query(
      'delete from github_installations where installation_id = $1',
      [installationId],
    )
  }
}
