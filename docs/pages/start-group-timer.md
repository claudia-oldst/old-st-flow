# Start Group Timer dialog

Opens from the timer icon in the top bar. Lets a developer start a single timer that will be split across several tickets when stopped.

## Layout
- Title: "Start group timer".
- **Filters** strip — project, epic, status, discipline; narrows the candidate list.
- **Tickets list** — checkboxes; shows ticket ID, title, current estimate vs. logged.
- **Note** textarea — optional, attached to every resulting time entry.
- Footer: **Cancel** + **Start timer** primary; the latter is disabled until at least one ticket is selected.

## Interactions
- Selecting tickets updates a "N tickets selected" line.
- Starting begins the global running timer immediately and closes the dialog. The top bar pill shows "Group (N tickets)" with elapsed time.
- Only one running timer is allowed per user — starting a new one auto-stops any existing single-ticket timer.
