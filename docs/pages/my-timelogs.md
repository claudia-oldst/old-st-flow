# My Timelogs

Route: `/my-timelogs`. Linked from the top bar between My Work and Admin.

## Layout
- Header with the current user's name, page title, and a **Log time** button.
- Toolbar: **Group by** (Month / Week / Day), **Project** multi-select filter, and the shared date-range control (defaults to the last 90 days).
- Summary line: total hours and entry count for the current filters.
- Grouped list: collapsible group headers (label, entry count, hours subtotal) over rows showing date, ticket ID, ticket title + note, project acronym, discipline, and hours.
- Pagination below the list (50 entries per page).

## Behaviour
- Shows only the signed-in user's `time_logs`; refreshes live via realtime.
- Group-by and project selections persist per user for the session.
- Clicking a row opens the existing Edit Time Log dialog (edit hours/note or delete), with the same capacity guard as elsewhere.
- **Log time** opens a project → ticket picker (only tickets assigned to the user), then hands off to the standard Log Time modal so discipline gating, estimate checks and capacity warnings behave identically.
