# Jabso Interface Language

Read this reference when deciding layout, component choice, UI copy, or visual consistency. The current implementation in `apps/web/src/app/globals.css` and `apps/web/src/shared/ui` remains the executable source of truth; inspect it before changing exact values.

## Character

Jabso is a focused engineering tool: quiet, dense enough for debugging, and explicit about security boundaries. Favor neutral surfaces, thin borders, restrained shadows, compact controls, and one strong red accent for errors or destructive emphasis. Avoid decorative dashboards, oversized marketing cards, gradients, or generic SaaS metric tiles.

The existing palette is white and cool gray with near-black text, blue focus indication, amber warning, and red accent. Reuse CSS variables before adding colors. Use the existing typography and tight negative heading tracking rather than introducing a second visual system.

## Hierarchy

- One clear page heading and one-sentence purpose.
- Sections are separated by whitespace or a single border before adding cards.
- Cards are for bounded settings or grouped controls, not every paragraph.
- Tables are for scan-heavy issue history; rows should keep status, title, counts, and time easy to compare.
- Empty states explain why the surface is empty and provide one primary next action.
- Destructive actions live in a distinct danger section and require `AlertDialog` confirmation.

## Navigation and Context

Primary navigation contains Issues, Projects, MCP, and Settings. The workspace switcher shows and changes context; its menu may create a workspace or link to settings, but member management and deletion belong on the Settings page.

On mobile, preserve access to primary navigation and account state without reproducing the entire desktop sidebar. Test labels, role selectors, long workspace names, and touch target sizes at the narrow breakpoint.

## Copy

Use direct nouns and verbs: “Create project”, “Install GitHub App”, “Send invite”. State the consequence of destructive or security-sensitive actions. Avoid calling the GitHub App connection a login.

Every new user-facing string belongs in the i18n catalog. Test English and Korean, including placeholders, copied-state labels, aria labels, error fallbacks, and status text. Technical identifiers such as DSN, MCP, release, dist, and GitHub App may remain as product terms when translation would reduce clarity.

## Interaction Selection

| Need | Preferred surface |
| --- | --- |
| Move among primary workflows | Sidebar navigation |
| Change active tenant | Workspace switcher |
| Manage workspace identity, access, or language | Settings page |
| Create or connect one object | Dialog |
| Confirm irreversible action | Alert dialog within the owning settings page |
| Explain first successful setup | Inline onboarding or empty state |
| Show authentication transition | Stable status view with localized progress copy |
