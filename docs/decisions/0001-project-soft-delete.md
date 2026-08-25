# Project removal uses soft deletion

## Context

Deleting a Jabso project through PostgreSQL cascades into its issues, events, releases, and private source-map artifacts. A single dashboard action should not permanently destroy that debugging history without a separately designed retention and recovery workflow.

## Decision

The dashboard's Delete action sets `projects.deleted_at` instead of deleting the row. Soft-deleted projects are excluded from project lists, cannot authenticate new ingestion, and cannot be selected for issue or release reads. Existing related records remain stored.

The timestamp exists only to identify when the project was removed and contains no additional PII. The retained project data continues to follow its existing retention policy; automatic purge and restore operations are intentionally deferred until those workflows have explicit authorization and tests.

## Consequences

- Accidental removal is recoverable through an operator database action.
- The public DSN stops accepting events immediately after removal.
- Removing the active project selects another available project or clears the active-project cookie.
- Storage is not reclaimed by the dashboard action.

## Rejected alternatives

- Cascading hard delete was rejected because it is irreversible and removes all debugging history immediately.
- Leaving deleted projects able to ingest was rejected because the UI state and collector behavior would disagree.
- A full archive/restore UI was deferred because the current private toy-project workflow only requires safe removal.
