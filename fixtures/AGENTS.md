# Fixture instructions

The root `AGENTS.md` applies here.

- Fixtures must be synthetic, deterministic, minimal, and safe to commit.
- Never copy production envelopes, user identity, cookies, tokens, request bodies, source maps, or session recordings.
- Preserve protocol details needed by the test, including byte lengths and malformed boundaries, without adding unrelated payload data.
- Name fixtures by behavior, not by a real project or incident.
- Update the owning parser tests whenever a fixture changes.
