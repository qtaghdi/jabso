# Documentation instructions

The root `AGENTS.md` applies here.

- `implementation-plan.html` is the phase source of truth. Update status, exit criteria, and next-phase scope there.
- Keep README concise and link to the plan instead of creating a duplicate Markdown roadmap.
- Architecture decisions belong in `decisions/` and should record context, decision, consequences, and rejected alternatives.
- Boundra-related findings belong in `boundra-report/`. Start from its report template, update the directory index in the same change, and distinguish an upstream Boundra defect from behavior that correctly exposed a Jabso integration problem.
- Document the deployed behavior, exact environment variable names, privacy impact, and operational steps; never include real secrets or DSNs.
- Keep examples runnable and synchronized with current package names, routes, and framework-specific file paths.
