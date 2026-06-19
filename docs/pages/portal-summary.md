# Public client portal — Summary tab

The client's main scope-and-pricing view.

## Layout
- **Intro** text (markdown) authored by PMBA.
- **Epics table** — one row per included epic, each expandable:
  - Collapsed: epic name, short summary, estimate hours, sub-total cost.
  - Expanded: PMBA-authored summary, a mini trend chart of estimate evolution, and the list of in-scope tickets.
- **Totals strip** at the bottom: total hours, applied discounts, total cost (with rate per hour).

## Interactions
- Click an epic row to expand/collapse.
- Click a ticket inside an expanded epic to open the **Client Ticket Sheet** — a stripped-down read-only sheet showing title, summary, and AC.
- All numbers reflect approved CRs and discounts, computed server-side.

## Notes
- Internal-only epics (toggled off in the editor) are hidden.
- Currency and rate are formatted using the project's configured locale.
