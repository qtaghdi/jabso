# Next.js route layer

The instructions in `apps/web/AGENTS.md` apply here.

- Keep this directory limited to App Router files, route handlers, metadata, global styles, and route-local loading or error states.
- Pages and layouts compose exports from `src/features`, `src/components`, and `src/lib`; do not place reusable product logic in a route file.
- Validate HTTP input in `route.ts`, call the owning library or feature operation, and translate the result into a response.
- Keep route groups and dynamic segments kebab-case. Await Next.js 16 request APIs and route props.
- A data route must include a shape-matched loading state and useful empty, not-found, and error behavior.
