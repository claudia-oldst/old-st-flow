# Bulk Assign dialog

Opened from the Bulk Actions bar after selecting two or more tickets.

## Layout
A dialog with three columns — **FE**, **BE**, **Project** — each containing the union of currently-assigned members across the selection.

Each assignee is shown as a chip in one of three visual states:
- **Solid** — assigned on every selected ticket.
- **Striped / half** — assigned on some, not all (mixed).
- **Outline** — not assigned on any (only appears once added in this dialog).

Below each column: a "+ Add member" picker.

## Interactions
- Clicking a solid chip removes that member from the slot on **every** selected ticket.
- Clicking a mixed chip promotes it to "assigned on all" on first click, and removes it on the second click.
- Adding a member from the picker assigns them to that slot on every selected ticket.
- The dialog computes the minimal diff (per-ticket inserts and deletes) and applies it on **Apply**.
- A header line shows "N tickets selected". A **Reset** button reverts pending changes without closing.

## Feedback
- On apply: toast "Updated N tickets", dialog closes, the list refreshes.
- Errors per ticket are surfaced in a single toast with a count.
