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

const upsertInstallation = async (
  database: SqlExecutor,
  workspaceId: string,
  installation: GitHubInstallation,
) => database.query<{ installation_id: string }>(
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

export class PostgresGitHubInstallationStore implements GitHubInstallationStore {
  constructor(private readonly database: SqlExecutor) {}

  async createClaim(input: { claimHash: string; expiresAt: string; installation: GitHubInstallation }) {
    await this.database.transaction(async (transaction) => {
      await transaction.query('delete from github_installation_claims where expires_at <= now()')
      await transaction.query(
        `insert into github_installation_claims
          (claim_hash, installation_id, account_id, account_login, account_type,
           repository_selection, suspended_at, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (installation_id) do update set
           claim_hash = excluded.claim_hash,
           account_id = excluded.account_id,
           account_login = excluded.account_login,
           account_type = excluded.account_type,
           repository_selection = excluded.repository_selection,
           suspended_at = excluded.suspended_at,
           expires_at = excluded.expires_at,
           created_at = now()`,
        [
          input.claimHash,
          input.installation.installationId,
          input.installation.accountId,
          input.installation.accountLogin,
          input.installation.accountType,
          input.installation.repositorySelection,
          input.installation.suspendedAt,
          input.expiresAt,
        ],
      )
    })
  }

  async claimInstallation(claimHash: string, workspaceId: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.query('delete from github_installation_claims where expires_at <= now()')
      const result = await transaction.query<InstallationRow>(
        `delete from github_installation_claims
         where claim_hash = $1 and expires_at > now()
         returning installation_id, account_id, account_login, account_type,
           repository_selection, suspended_at`,
        [claimHash],
      )
      const row = result.rows[0]
      if (!row) return false
      const stored = await upsertInstallation(transaction, workspaceId, installationFromRow(row))
      return Boolean(stored.rows[0])
    })
  }

  async createInstallationRequest(input: {
    accountId: string
    expiresAt: string
    requestId: string
    requesterId: string
    workspaceId: string
  }) {
    return this.database.transaction(async (transaction) => {
      await transaction.query('delete from github_installation_requests where expires_at <= now()')
      const result = await transaction.query<{ account_id: string }>(
        `insert into github_installation_requests
          (account_id, request_id, requester_id, workspace_id, expires_at)
         values ($1, $2, $3, $4, $5)
         on conflict (account_id) do update set
           request_id = excluded.request_id,
           requester_id = excluded.requester_id,
           expires_at = excluded.expires_at,
           updated_at = now()
         where github_installation_requests.workspace_id = excluded.workspace_id
         returning account_id`,
        [input.accountId, input.requestId, input.requesterId, input.workspaceId, input.expiresAt],
      )
      return Boolean(result.rows[0])
    })
  }

  async connectRequestedInstallation(requesterId: string, installation: GitHubInstallation) {
    return this.database.transaction(async (transaction) => {
      await transaction.query('delete from github_installation_requests where expires_at <= now()')
      const pending = await transaction.query<{ workspace_id: string }>(
        `delete from github_installation_requests
         where account_id = $1 and requester_id = $2 and expires_at > now()
         returning workspace_id`,
        [installation.accountId, requesterId],
      )
      const workspaceId = pending.rows[0]?.workspace_id
      if (!workspaceId) return false
      const stored = await upsertInstallation(transaction, workspaceId, installation)
      return Boolean(stored.rows[0])
    })
  }

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
    const result = await upsertInstallation(this.database, workspaceId, installation)
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
