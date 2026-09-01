import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const issueStatus = pgEnum('issue_status', ['unresolved', 'resolved', 'ignored'])
export const symbolicationStatus = pgEnum('symbolication_status', [
  'not_applicable',
  'pending',
  'completed',
  'missing',
  'failed',
])
export const workspaceKind = pgEnum('workspace_kind', ['personal', 'team', 'organization'])

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
})

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    activeOrganizationId: text('active_organization_id'),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    issuer: text('issuer').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex('account_issuer_accountId_uidx').on(table.issuer, table.accountId),
    index('account_userId_idx').on(table.userId),
  ],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull(),
  metadata: text('metadata'),
})

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    role: text('role').default('member').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [
    index('member_organizationId_idx').on(table.organizationId),
    index('member_userId_idx').on(table.userId),
  ],
)

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    inviterId: text('inviter_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  },
  (table) => [
    index('invitation_organizationId_idx').on(table.organizationId),
    index('invitation_email_idx').on(table.email),
  ],
)

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    kind: workspaceKind('kind').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('workspaces_external_id_uidx').on(table.externalId)],
)

export const githubInstallations = pgTable(
  'github_installations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    installationId: text('installation_id').notNull(),
    accountId: text('account_id').notNull(),
    accountLogin: text('account_login').notNull(),
    accountType: text('account_type').notNull(),
    repositorySelection: text('repository_selection').notNull(),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('github_installations_installation_id_uidx').on(table.installationId),
    index('github_installations_workspace_account_idx').on(table.workspaceId, table.accountLogin),
  ],
)

export const githubInstallationStates = pgTable(
  'github_installation_states',
  {
    stateHash: text('state_hash').primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('github_installation_states_expires_idx').on(table.expiresAt)],
)

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  dsnProjectId: text('dsn_project_id').notNull().unique(),
  publicKey: text('public_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [index('projects_workspace_created_idx').on(table.workspaceId, table.createdAt)])

export const mcpConnections = pgTable(
  'mcp_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    tokenPrefix: text('token_prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('mcp_connections_token_hash_uidx').on(table.tokenHash),
    index('mcp_connections_workspace_created_idx').on(table.workspaceId, table.createdAt),
  ],
)

export const mcpConnectionProjects = pgTable(
  'mcp_connection_projects',
  {
    connectionId: uuid('connection_id').references(() => mcpConnections.id, { onDelete: 'cascade' }).notNull(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mcp_connection_projects_connection_project_uidx').on(table.connectionId, table.projectId),
    index('mcp_connection_projects_project_idx').on(table.projectId),
  ],
)

export const mcpAuditLogs = pgTable(
  'mcp_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    connectionId: uuid('connection_id').references(() => mcpConnections.id, { onDelete: 'cascade' }).notNull(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    tool: text('tool').notNull(),
    outcome: text('outcome').notNull(),
    durationMs: integer('duration_ms').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('mcp_audit_logs_connection_occurred_idx').on(table.connectionId, table.occurredAt),
    index('mcp_audit_logs_workspace_occurred_idx').on(table.workspaceId, table.occurredAt),
  ],
)

export const projectRepositoryConnections = pgTable('project_repository_connections', {
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).primaryKey(),
  provider: text('provider').notNull().default('github'),
  externalId: text('external_id').notNull(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  defaultBranch: text('default_branch').notNull(),
  private: boolean('private').notNull(),
  rootPath: text('root_path').notNull().default(''),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const releases = pgTable(
  'releases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    version: text('version').notNull(),
    dist: text('dist').notNull().default(''),
    deployedAt: timestamp('deployed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('releases_project_version_dist_uidx').on(table.projectId, table.version, table.dist),
    index('releases_project_created_idx').on(table.projectId, table.createdAt),
  ],
)

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    fingerprint: text('fingerprint').notNull(),
    title: text('title').notNull(),
    exceptionType: text('exception_type'),
    level: text('level').notNull().default('error'),
    status: issueStatus('status').notNull().default('unresolved'),
    eventCount: integer('event_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    regressedAt: timestamp('regressed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('issues_project_fingerprint_uidx').on(table.projectId, table.fingerprint),
    index('issues_project_last_seen_idx').on(table.projectId, table.lastSeenAt),
  ],
)

export const issueReleases = pgTable(
  'issue_releases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    issueId: uuid('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
    releaseId: uuid('release_id').references(() => releases.id, { onDelete: 'cascade' }).notNull(),
    eventCount: integer('event_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    previousResolvedAt: timestamp('previous_resolved_at', { withTimezone: true }),
    regressedAt: timestamp('regressed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('issue_releases_issue_release_uidx').on(table.issueId, table.releaseId),
    index('issue_releases_release_regressed_idx').on(table.releaseId, table.regressedAt),
  ],
)

export const sourceMapArtifacts = pgTable(
  'source_map_artifacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    releaseId: uuid('release_id').references(() => releases.id, { onDelete: 'cascade' }).notNull(),
    path: text('path').notNull(),
    checksum: text('checksum').notNull(),
    content: bytea('content').notNull(),
    byteSize: integer('byte_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('source_map_artifacts_release_path_uidx').on(table.releaseId, table.path),
  ],
)

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: text('event_id').notNull(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    issueId: uuid('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
    message: text('message'),
    exceptionType: text('exception_type'),
    level: text('level').notNull().default('error'),
    platform: text('platform'),
    environment: text('environment'),
    release: text('release'),
    dist: text('dist'),
    releaseId: uuid('release_id').references(() => releases.id, { onDelete: 'set null' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    stacktrace: jsonb('stacktrace'),
    symbolicatedStacktrace: jsonb('symbolicated_stacktrace'),
    symbolicationStatus: symbolicationStatus('symbolication_status').notNull().default('not_applicable'),
    symbolicationErrorCode: text('symbolication_error_code'),
    symbolicatedAt: timestamp('symbolicated_at', { withTimezone: true }),
    tags: jsonb('tags'),
    breadcrumbs: jsonb('breadcrumbs'),
    context: jsonb('context'),
  },
  (table) => [
    uniqueIndex('events_project_event_id_uidx').on(table.projectId, table.eventId),
    index('events_issue_received_idx').on(table.issueId, table.receivedAt),
    index('events_release_symbolication_idx').on(table.releaseId, table.symbolicationStatus),
  ],
)

export const internalDiagnostics = pgTable(
  'internal_diagnostics',
  {
    id: uuid('id').primaryKey(),
    kind: text('kind').notNull(),
    code: text('code'),
    message: text('message').notNull(),
    contract: text('contract'),
    operation: text('operation'),
    issues: jsonb('issues'),
    context: jsonb('context'),
    boundraVersion: text('boundra_version').notNull(),
    jabsoVersion: text('jabso_version'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('internal_diagnostics_occurred_idx').on(table.occurredAt)],
)
