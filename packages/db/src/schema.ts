import {
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

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  dsnProjectId: text('dsn_project_id').notNull().unique(),
  publicKey: text('public_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    fingerprint: text('fingerprint').notNull(),
    title: text('title').notNull(),
    level: text('level').notNull().default('error'),
    status: issueStatus('status').notNull().default('unresolved'),
    eventCount: integer('event_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('issues_project_fingerprint_uidx').on(table.projectId, table.fingerprint),
    index('issues_project_last_seen_idx').on(table.projectId, table.lastSeenAt),
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
    level: text('level').notNull().default('error'),
    platform: text('platform'),
    environment: text('environment'),
    release: text('release'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    stacktrace: jsonb('stacktrace'),
    tags: jsonb('tags'),
  },
  (table) => [
    uniqueIndex('events_project_event_id_uidx').on(table.projectId, table.eventId),
    index('events_issue_received_idx').on(table.issueId, table.receivedAt),
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
