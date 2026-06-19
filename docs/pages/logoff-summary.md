# Logoff Summary dialog

Opened from the **Logoff** button in the top bar (or by clicking the Weekly Hours bar).

## Layout
- Title: "Today's logoff summary" with the date.
- **Day list** — grouped time entries for the chosen day:
  - Per-ticket row with ticket ID, title, discipline, hours, optional note.
  - Sub-total per project.
- **Day total** at the bottom, plus capacity comparison (e.g. "6.5h / 8h").
- **Copy** button — copies a markdown summary to clipboard for pasting into Slack/email.
- **Date picker** — switch to a different day (defaults to today).

## Interactions
- Clicking a row opens the entry's Edit Time Log dialog.
- The Copy action shows a "Copied" tick for 2s.
- Closing the dialog doesn't change any data — it's read-only except via row click.
