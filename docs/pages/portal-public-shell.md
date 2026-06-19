# Public client portal — shell

**Route:** `/h/:hash` — public, no sign-in required.

The frame around the client-facing portal. Minimal chrome so the client sees the project, not the app.

## Header
- Centered max-width strip with the Old St Labs logo only.
- No nav, no user menu.

## Body
- Three-tab interface (default Timeline):
  - **Timeline**
  - **Summary**
  - **Change Requests**

## States
- **Loading** — centered "Loading…".
- **Invalid / disabled hash** — "This portal isn't available." (no further information leaked).
- **Loaded** — tabs render.

## Notes
- Width: same `max-w-[1280px]` shell as the app, but in light/dark agnostic styling.
- No telemetry-gated content — anyone with the hash sees it.
