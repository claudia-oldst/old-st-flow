# Vault Dashboard

Replaces the normal project workspace when `is_archived` is true.

## Header
- Same project header as the active workspace, but with a gold "Vaulted" badge and no edit affordances.

## Body
- **Summary panel** — final stats at the time of archive: total tickets, hours logged, total invoiced, profit margin.
- **Download archive** button — generates a one-click `.zip` of everything (delegates to the Export Project flow).
- **Members snapshot** — the team as it was at archive time.
- **Rehydrate** button (PMBA only) — opens a confirmation dialog. Rehydrating restores the project to active state and, if any original members are missing, opens the **Member Remap dialog** to map archived assignees to current users.

## Member Remap dialog
A two-column list: archived member on the left, "Map to current member" combo box on the right. Required for every assignee with a missing user. **Confirm** completes the rehydrate.

## Notes
- All other tabs (Tickets, Sprints, etc.) are hidden while archived — Vault Dashboard is the only view.
