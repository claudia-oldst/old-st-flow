# Admin — Status rules

**Tab:** `/admin` → Status rules — PMBA only.

Defines how a ticket's overall workflow status is derived from its FE / BE / Project discipline statuses. PMBA can override the default rule per row.

## Layout
- A table of rules. Each row represents a combination of FE state + BE state + Project state and the resulting workflow status.
- Columns: FE chip group, BE chip group, Project chip group, → resulting Status pill, edit action.
- **+ Add rule** button.
- Below the table: a **Preview matrix** — every possible FE×BE combination with the resulting status, useful to sanity-check rule changes.

## Interactions
- Chip groups allow selecting one or more discipline states for a single rule (e.g. "if FE is `in_progress` OR `for_integration` AND BE is `done` → status `In QA`").
- The resulting status is picked from the workspace statuses defined in the Statuses tab.
- Drag to reorder rules — first-match wins.
- Delete row with confirmation.

## Preview matrix
- Live re-computes as rules change, so you can see the impact before saving.
- Cells with no matching rule are flagged in coral.

## Notes
- Rule changes apply to every project in the workspace and re-derive ticket statuses in real time.
