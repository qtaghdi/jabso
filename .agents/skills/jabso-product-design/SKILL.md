---
name: jabso-product-design
description: Design or review Jabso dashboard, authentication, onboarding, workspace, GitHub, issue, and MCP interfaces when product structure, interaction choice, responsive behavior, or UI copy must be decided.
---

# Jabso Product Design

Use this skill before implementation when a Jabso UI request leaves room for product or interaction decisions. Read the repository and web `AGENTS.md` files first. For established visual patterns and product semantics, read [references/interface-language.md](references/interface-language.md).

## Decide the Product Shape

Start from the user's job, not from the component requested. Identify:

- the primary object being acted on: issue, project, workspace, repository installation, or MCP connection;
- whether the action is frequent navigation, context switching, configuration, or a bounded confirmation;
- who may act and what a read-only member should see;
- what must remain understandable in both English and Korean.

Use these placement rules:

- Sidebar: stable high-frequency destinations and the active workspace switcher only.
- Settings: workspace identity, membership, language, permissions, and destructive administration.
- Full page: multi-section management, inspectable history, or tasks users may revisit.
- Dialog: one bounded create, connect, invite, or confirm action that does not need its own URL.
- Inline state: loading, empty, validation, permission, connection, and recoverable errors close to the affected content.

Do not grow the sidebar into an administration console. Do not hide durable configuration inside a transient popover. When a requested UI conflicts with these rules, explain the tradeoff and choose the surface that best matches the user job.

## Preserve Jabso's Mental Models

- Issues is the primary workflow. Projects configure isolated inboxes and DSNs; they are not the product home.
- GitHub sign-in proves identity. A GitHub App installation separately grants repository metadata access to the active workspace. Show these as distinct steps whenever both appear in one flow.
- Personal is private to one user. Team and Organization are shared workspace kinds backed by Better Auth organizations; do not imply they are GitHub organizations.
- MCP connections are scoped, read-only credentials. Make project access and one-time secret handling explicit.
- Prefer progressive disclosure: show the next required action, then reveal advanced settings where the user expects to manage them.

## Design Every State

Before coding, make a compact state matrix covering the states that apply:

- initial loading and repeat navigation;
- empty and first-run onboarding;
- populated and partially configured;
- member versus admin or owner;
- pending mutation, success, recoverable error, and destructive confirmation;
- desktop, narrow mobile, long names, and long DSNs or tokens;
- English and Korean copy expansion.

Keep pending button geometry stable. Prefer a spinner and disabled state over changing action verbs. Use the shared UI primitives and preserve keyboard operation, focus visibility, labels, and live status announcements.

## Verify the Experience

Inspect the existing screen before editing. After implementation, verify the actual rendered flow rather than relying only on a build. Check at least one desktop and one narrow viewport when layout changed, and switch both locales when copy or spacing changed. Report any signed-in or production state that could not be exercised.
