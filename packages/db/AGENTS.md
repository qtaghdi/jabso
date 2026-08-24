# Database package instructions

The root and `packages/AGENTS.md` instructions apply here.

## Schema and migrations

- `src/schema.ts` is the current schema source. Generate a new migration for every persisted schema change.
- Never edit an applied migration. Keep generated SQL and Drizzle metadata in the same commit.
- Run migrations explicitly with root `pnpm db:migrate`; application startup must not mutate schema implicitly.
- Seed data is local bootstrap data only and must contain no production identifiers, credentials, or events.

## SQL executor

- Keep `SqlExecutor` small, transaction-aware, and independent of app/domain types.
- postgres.js may infer JSONB and serialize parameters. Raw adapters passing JSON text must use `$n::text::jsonb`; passing JSON text directly to `$n::jsonb` can store a JSON string instead of an array/object.
- Repository adapters, not this package, own conversion from driver rows to domain contracts.
- Preserve Node.js 24 and Neon-compatible PostgreSQL behavior; verify provider-sensitive behavior with an explicit smoke check.
