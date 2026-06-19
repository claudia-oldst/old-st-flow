# Top bar (global header)

Persistent header rendered on every authenticated screen.

## Layout (left → right)
- **Old St Labs logo** — links to `/` (Projects).
- **Primary nav links** — Projects, My Work, and (PMBA only) Admin. The active link is underlined.
- **Running timer pill** (when a timer is active) — shows the ticket ID, elapsed time, and a stop button. Clicking the pill opens the ticket; clicking the stop icon opens the Stop Group Timer dialog.
- **Log Time** button — opens the Log Time modal pre-targeted at "today".
- **Logoff summary** button — opens the end-of-day summary dialog.
- **User avatar / menu** — current user's avatar with a popover containing sign-out and (if not linked) a GitHub-link entry.

## Behaviour
- Stays fixed across route changes; never re-mounts, so an in-flight timer keeps ticking.
- Links use NavLink active states; the Admin entry is hidden entirely for non-PMBA roles.
- Long project/ticket names in the timer pill are truncated with an ellipsis and reveal on hover.
