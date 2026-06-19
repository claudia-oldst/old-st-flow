# Project Tickets

**Tab:** `/projects/:id` (default)

The main work surface for a project. Combines a filter/group toolbar, a paginated ticket list (or board), bulk-action mode, and inline quick-add.

## Toolbar
- **Search** input — matches title, ticket ID, GitHub issue number.
- **Filter** popover — multi-select chips for status, type (Standard/Bug/CR), epic, assignee, FE status, BE status, CR approval state. Active filter count badge on the trigger.
- **Group by** dropdown — None, Epic, Status, Assignee.
- **Card display** menu — toggles which secondary fields are shown on each card (estimates, hours, assignees, GitHub badge, etc.).
- **+ Add tickets** primary button (PMBA only) — opens the Add Tickets dialog.

All toolbar state persists in the URL.

## List
- Grouped sections with collapsible headers when "Group by" is on.
- Each row/card shows: ticket ID, title (with `[Bug]` or `[CR]` prefix), status pill, epic chip, FE/BE chips with hours, assignee avatars, GitHub badge.
- Quick-add row appears at the bottom of each group (PMBA): type a title and hit Enter to create a ticket inheriting the group's epic/status.
- Cards are draggable to reorder within a group (PMBA).

## Selection & bulk actions
- Checkbox in the card hover state. Selecting one ticket reveals the **Bulk actions bar** at the bottom of the viewport.
- Bulk actions: Assign… (opens Bulk Assign Dialog), Change status, Change epic, Delete, Clear selection.

## Pagination
Numeric pager at the bottom, with page size selector. Page resets to 1 when filters change.

## Realtime
The list updates live as tickets are created, edited, assigned, or moved on the board.
