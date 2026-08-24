# Boundra domain instructions

The root `AGENTS.md` applies here. Each direct child is one business capability.

## Domain structure

- Declare ownership and dependencies in `domain.json` before adding cross-domain imports.
- Define bounded Zod input and result contracts under `shared/contracts` first.
- Put use-case orchestration and store interfaces under `server`; browser-facing adapters under `client`; MCP adapters under `mcp`.
- Export only supported entry points through each layer's `public.ts`. Never import another domain's internal file.
- Domain code must not depend on Fastify, Next.js, SQL drivers, environment variables, or HTTP status codes.

## Behavior and safety

- Return contract-ready plain data with ISO timestamp strings and bounded collections.
- Keep project identity explicit in every project-owned query and mutation.
- Treat malformed adapter results as failures at the boundary; do not weaken a contract to accommodate corrupt storage.
- Record Boundra runtime failures only through `@jabso/diagnostics` using the safe serialized shape.
- MCP remains read-only until a specific write capability and authorization model are approved.

## Verification

- Add behavior tests in the owning domain's `tests` directory.
- Run `pnpm boundra:check` whenever manifests, dependencies, imports, or public exports change.
