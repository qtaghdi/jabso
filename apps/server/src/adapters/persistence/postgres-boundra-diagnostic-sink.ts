import type { SqlExecutor } from '@jabso/db'
import type { BoundraDiagnostic, DiagnosticSink } from '@jabso/diagnostics'

const retentionDays = 30
const cleanupBatchSize = 100

const json = (value: unknown) => value === undefined ? null : JSON.stringify(value)

export const createPostgresBoundraDiagnosticSink = (database: SqlExecutor): DiagnosticSink => {
  return async (diagnostic: BoundraDiagnostic) => {
    await database.transaction(async (transaction) => {
      await transaction.query(
        `insert into internal_diagnostics
          (id, kind, code, message, contract, operation, issues, context,
           boundra_version, jabso_version, occurred_at)
         values ($1, $2, $3, $4, $5, $6, $7::text::jsonb, $8::text::jsonb, $9, $10, $11)
         on conflict (id) do nothing`,
        [
          diagnostic.id,
          diagnostic.kind,
          diagnostic.code ?? null,
          diagnostic.message,
          diagnostic.contract ?? null,
          diagnostic.operation ?? null,
          json(diagnostic.issues),
          json(diagnostic.context),
          diagnostic.boundraVersion,
          diagnostic.jabsoVersion ?? null,
          diagnostic.occurredAt,
        ],
      )
      await transaction.query(
        `delete from internal_diagnostics
         where id in (
           select id from internal_diagnostics
           where occurred_at < now() - ($1 * interval '1 day')
           order by occurred_at, id
           limit $2
         )`,
        [retentionDays, cleanupBatchSize],
      )
    })
  }
}
