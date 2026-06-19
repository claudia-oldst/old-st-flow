# Log Time modal

Opened from the top bar, a ticket row, the Workbench, or the Ticket Detail sheet.

## Layout
- Title: "Log time".
- **Ticket** picker — search-as-you-type across all tickets the user can see. Pre-filled when opened from a specific ticket.
- **Discipline** picker — FE / BE / Project, gated by what the user is allowed to log on this ticket.
- **Date** picker — defaults to today.
- **Duration** — either a number (hours) or a `HH:MM` input; live converts to decimal hours.
- **Description** — optional free text.
- Footer: **Cancel** + **Log** primary.

## Capacity check
- Before saving, the modal checks the user's remaining capacity for the chosen day.
- If logging would push them over, a yellow warning appears with the new total and a **Log anyway** confirmation button.

## Feedback
- On success: toast "Logged Xh on TICKET-ID", modal closes, Weekly Hours bar and any open ticket sheet update live.
