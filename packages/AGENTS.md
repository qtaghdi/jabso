# Shared package instructions

The root `AGENTS.md` applies here. Packages provide focused technical capabilities shared by apps and domains.

## Boundaries

- Keep packages framework-agnostic unless the package explicitly owns a framework adapter.
- A package must not import from `apps/*` or a domain's internal files.
- Expose the smallest stable API through `package.json` exports and typed entry points.
- Add dependencies only to the owning package and keep browser/server entry points separate when runtime capabilities differ.
- Prefer pure helpers and dependency injection over hidden global state.

## Safety and testing

- Parsers must enforce byte, item, and nesting limits before allocating unbounded data.
- Never log or persist raw tokens, user identity, request payloads, recordings, or source-map contents.
- Unit-test malformed input and edge cases in the owning package. Adapter/database behavior belongs in an app integration test.
