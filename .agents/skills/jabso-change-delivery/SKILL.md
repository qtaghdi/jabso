---
name: jabso-change-delivery
description: Scope and deliver Jabso repository changes when deciding PR boundaries, commit structure, verification depth, review handling, or deployment status reporting.
---

# Jabso Change Delivery

Use this skill at the start of a Jabso implementation and again before handoff. It supplements the repository delivery rules with an explicit slicing workflow.

## Establish the Baseline

Fetch `origin`, inspect `origin/main`, open PRs, ancestry, and the working tree before editing. Create a separate worktree from current `origin/main` for each PR. Do not base a new change on an unmerged feature unless the user explicitly wants a stacked PR.

## Choose PR Boundaries First

Split work into separate PRs when any of these are true:

- one part can ship or roll back independently;
- changes have different reviewers or risk profiles, such as UI copy versus database integrity;
- a migration or deployment-order change can be isolated;
- one part is reusable infrastructure and another is product behavior;
- the combined diff would make reviewers hold multiple mental models at once.

Keep one PR when the slices would be incomplete, misleading, or untestable alone. State the intended PR slices before implementation whenever more than one substantial concern is present.

## Plan Commits Before Coding

Each commit should express one coherent reason for change and leave the branch buildable when practical. Typical boundaries are:

1. infrastructure or shared primitive;
2. product behavior using it;
3. targeted tests or migration when they are independently meaningful;
4. review fixes grouped by concern.

Stage explicit paths. Do not wait until the end and place an entire multi-feature diff in one commit. Avoid a separate “cleanup” commit for work that belongs in the immediately preceding change; amend before pushing when safe.

## Verification Ladder

During development, run the narrowest useful lint, typecheck, and test. Before pushing, run checks proportional to the changed surfaces. Before handoff, run the repository-required verification, inspect `origin/main...HEAD`, and confirm no generated files or unrelated edits remain.

Verify behavior, not only compilation. UI work needs rendered desktop/narrow states and relevant locales. Auth, GitHub, database, and deployment work needs an end-to-end boundary check or an explicit statement of what environment prevented it.

## Review Loop

Treat reviewer text as a hypothesis. Reproduce each finding against current code, classify it as valid, pre-existing but relevant, or invalid, and explain the evidence. Fix valid findings in focused commits; add a regression test for data-integrity or authorization defects. Re-run the appropriate checks, push, and inspect the new CI and Preview results.

Do not resolve a thread merely because code changed. Confirm the finding's invariant now holds. If an automated rereview is rate-limited, manually audit every original item and report that limitation.

## Handoff Language

Report separately:

- implemented locally;
- committed and pushed;
- CI and Preview status;
- Production verification, if actually performed;
- remaining review, migration, or rollout action.

Never call Preview “Production” or a successful build “working” without behavioral evidence.
