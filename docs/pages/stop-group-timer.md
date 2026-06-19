# Stop Group Timer dialog

Opens when the user clicks **Stop** on a running group timer.

## Layout
- Title: "Stop group timer".
- Read-out of total elapsed time.
- **Rows list** — one row per ticket the timer covers:
  - Ticket ID + title.
  - Discipline picker (FE / BE / Project), defaulted from the ticket's assignment.
  - Hours field — auto-distributed evenly across rows; user can edit.
  - "Locked" indicator next to rows whose value the user has manually changed; the rest re-balance to match the elapsed total.
- A live "Allocated X / Yh" summary; turns coral if over/under.
- **Note** field shared by all entries.
- Footer: **Discard** + **Save** primary. Save is disabled until allocations match the elapsed total within rounding tolerance.

## Behaviour
- On Save: one time entry is written per row; toast "Saved N entries".
- On Discard: a confirmation prompt; if confirmed, the elapsed time is dropped without writing entries.
