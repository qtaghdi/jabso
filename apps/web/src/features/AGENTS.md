# Feature layer

The instructions in `apps/web/AGENTS.md` apply here.

- Each direct child owns one user-visible workflow. Name features by product language, not technical layers.
- Keep feature components, server operations, models, and tests together. Create those subfolders only when they contain real code.
- Features may import `src/components` and `src/lib`, but never `src/app`.
- Avoid sibling-feature imports. Compose workflows in a route or the dashboard shell, or move genuinely shared code to `src/components` or `src/lib`.
- Client components own interaction only. Fetch initial data in a Server Component and hydrate or seed the client cache when repeated navigation benefits from it.
