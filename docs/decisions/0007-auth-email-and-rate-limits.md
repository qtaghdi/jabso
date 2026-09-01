# Authentication email and rate limits use explicit infrastructure

## Context

Email/password authentication was available after the Better Auth migration, but users could not verify ownership of an address or recover a password. Better Auth's default in-memory rate limiter is also not a shared security boundary on Vercel because independent function instances do not share memory.

## Decision

Jabso requires email verification for credential accounts and uses Resend for verification and password-reset messages. Better Auth creates one-hour tokens, stores them in its existing verification table, and dispatches delivery through Vercel background tasks. Successful password resets revoke existing sessions. Password-reset requests always return the same user-facing result whether an address exists or not.

Authentication endpoints use Better Auth's database rate limiter with stricter rules for email sign-in, sign-up, verification resend, reset request, and reset completion. Migration `0010` adds the `rate_limit` table to the same PostgreSQL database used by Better Auth.

GitHub OAuth remains a trusted identity path and does not require a second Jabso verification email.

## Consequences

- The web deployment requires `RESEND_API_KEY` and a Resend-verified `JABSO_AUTH_EMAIL_FROM` sender before email self-service is usable.
- Operators must apply migration `0010` before deploying the web change.
- Verification and reset links expire after one hour. Reset links are single-use.
- Jabso sends the destination address and transactional content to Resend; email bodies are not stored by Jabso.
- The database limiter is consistent across serverless instances but adds a small database read/write cost to protected authentication requests.
- Organization invitation and membership management remain separate product work.
