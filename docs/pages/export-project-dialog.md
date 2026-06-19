# Export Project dialog

Opened from the download icon in the project header (PMBA only, hidden when archived).

## Layout
- Title: "Export project".
- Short description explaining what's exported (tickets, time logs, estimates, change requests, comments).
- **Format** select — JSON or CSV bundle.
- **Include** checkboxes — Tickets, Time logs, Comments, Attachments metadata, Change requests, Estimates history.
- **Date range** — optional; defaults to "all time".
- Footer: **Cancel** + **Download** primary.

## Behaviour
- On **Download** the app assembles the bundle client-side, packages it into a `.zip`, and triggers a browser download with a filename built from the project acronym and timestamp.
- Progress is shown inline ("Collecting tickets…", "Packaging…").
- Errors are surfaced as a toast; the dialog stays open so the user can retry.
