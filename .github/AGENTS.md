# GitHub automation instructions

The root `AGENTS.md` applies here.

- CI must use pnpm with the committed lockfile and Node.js 24.
- Required verification should remain equivalent to root `pnpm check` and `pnpm build` unless a documented split preserves the same coverage.
- Keep workflows least-privileged, pin third-party actions deliberately, and never print secrets or production environment values.
- Pull requests are ready for review by default and should report migration, privacy, and deployment impact.
