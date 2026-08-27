# Screen layer

The instructions in `apps/web/AGENTS.md` apply here.

- Each direct child corresponds to a routed product screen or a closely related screen flow.
- Keep screen-specific presentation and browser interaction together and shallow; do not add a `components` subfolder when every file is already part of the same screen.
- Screens may import `src/widgets` and `src/shared`, but never route modules or another screen.
- Routes fetch and authorize server data, then compose the matching screen with bounded props.
- Move UI reused across multiple screens to a widget or shared primitive instead of importing sibling screens.
