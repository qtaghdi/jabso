# Widget layer

The instructions in `apps/web/AGENTS.md` apply here.

- Widgets are reusable product-aware UI assemblies such as the dashboard shell or workspace switcher.
- Widgets may import `src/shared`, but never `src/screens` or `src/app`.
- Keep state with the widget that owns the interaction. Expose small composition props instead of boolean mode matrices.
- A widget that contains secret-bearing server work must keep it in a clearly named server module and never import it from a client component.
