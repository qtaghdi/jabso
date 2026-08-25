# Spike instructions

The root `AGENTS.md` applies here.

- Spikes are non-production experiments and must remain isolated from workspace runtime dependencies and deployment paths.
- Do not promote spike code by importing it from `apps`, `domains`, or `packages`; reimplement the validated behavior behind production boundaries.
- Keep Replay disabled until the implementation plan explicitly reopens that phase.
- Store only sanitized synthetic artifacts. Never retain real recordings or raw user data.
- Record the question, constraints, result, and keep/remove decision in the spike README.
