# Not Found (`*`)

**Source:** `src/pages/NotFound.tsx` · Catch-all route inside the protected area.

## Purpose
Fallback for any unmatched URL.

## Behaviour
- Logs `console.error("404 Error: User attempted to access non-existent route:", pathname)` on mount/path change (useful when triaging session replays).
- Renders a centered 404 panel with a "Return to Home" link to `/`.

## Notes
- Plain `<a href="/">` (full reload) rather than `<Link>` — intentional so any broken client-side state is reset.
- Styling uses the `bg-muted` token, not the glass shell used elsewhere.
