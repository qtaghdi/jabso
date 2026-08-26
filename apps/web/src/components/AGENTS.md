# Shared component layer

The instructions in `apps/web/AGENTS.md` apply here.

- Components here are feature-agnostic. They may import other shared components or technical helpers from `src/lib`, but never `src/features` or `src/app`.
- Put product workflows in `src/features`; do not make a shared primitive aware of issues, projects, workspaces, or Clerk behavior.
- Keep `ui` primitives accessible and stable across pending, error, disabled, focus, and narrow-screen states.
- Prefer explicit props and composition over boolean modes that make one component serve unrelated layouts.
