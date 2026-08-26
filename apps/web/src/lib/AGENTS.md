# Shared library layer

The instructions in `apps/web/AGENTS.md` apply here.

- Libraries are reusable technical adapters or cross-feature contracts. They must not import from `src/app` or `src/features`.
- Keep Clerk/workspace authorization in `auth`, TanStack Query contracts in `dashboard`, collector API access in `jabso`, and third-party provider adapters in `integrations`.
- Mark secret-bearing modules with `server-only`. Do not let a client component import a module that reads environment variables, Clerk server APIs, cookies, or dashboard credentials.
- Validate external responses at the adapter boundary and expose bounded, product-shaped values.
- Import concrete files directly. Do not add runtime barrels for convenience.
