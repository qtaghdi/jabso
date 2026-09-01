# Shared web layer

The instructions in `apps/web/AGENTS.md` apply here.

- `ui`, `brand`, and `providers` are product-agnostic presentation building blocks.
- `api` owns server-only Jabso collector access, `auth` owns Better Auth configuration and workspace resolution, `query` owns TanStack Query contracts, and `integrations` owns third-party adapters.
- Shared modules never import from `src/screens`, `src/widgets`, or `src/app`.
- Mark secret-bearing modules with `server-only` and validate external responses at the adapter boundary.
- Authentication email adapters may receive Better Auth action URLs but must never log or persist them. Keep provider credentials server-only and expose account-neutral failures to browser code.
- Import concrete modules directly; do not create runtime barrels only to shorten paths.
