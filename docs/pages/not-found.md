# Not Found screen

**Route:** any unmatched URL inside the protected area.

A minimal fallback shown when a route doesn't exist (typo, stale link, deleted resource).

## Layout
Centered on a muted background:
- Big "404".
- Subtitle: "Oops! Page not found".
- Underlined link: **Return to Home** (full page reload back to `/`).

## Behaviour
- Logs the offending pathname to the console so it shows up in session replays and error reports.
- The "Return to Home" link is a hard navigation (not client-side) — intentional, so any broken local state is reset.
