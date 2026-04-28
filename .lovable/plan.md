## Goal

For PMBA users, replace the standalone "Import CSV" button in the ticket toolbar with a primary **"Add ticket"** CTA that opens a multi-row creation dialog. The CSV import becomes a secondary action accessible from a dropdown attached to the Add ticket button.

## UX

**Toolbar (PMBA only)**
- Primary button: `+ Add ticket` (opens AddTicketsDialog)
- Adjacent caret button (chevron-down) opens a dropdown menu with: `Import from CSV…` → opens existing import dialog
- Non-PMBA users: no change (still no Add ticket / no import).

**AddTicketsDialog**
- Modal with a vertical stack of "ticket draft" rows. Starts with one empty row.
- Each row contains, on a single responsive line:
  - Title (text input, required, autofocus on first row)
  - Type (Select: Standard / Bug / CR / Proj)
  - Epic (existing `EpicSelect` component — supports inline create)
  - Project status (Select populated from `useStatuses()` — same options as elsewhere; defaults to first `backlog` status)
  - FE estimate (number, hidden when type = Proj)
  - BE estimate (number, hidden when type = Proj)
  - Project estimate (number, shown only when type = Proj)
  - Assign (button → opens a popover with the same FE / BE / Project Contributors slot pickers as `AssignDialog`, scoped to a not-yet-created ticket; selections held in local state). Trigger shows count + avatars.
  - Trash icon to remove the row (disabled if it's the only row).
- Footer:
  - Left: `+ Add another ticket` ghost button — appends a fresh empty draft row.
  - Right: `Cancel` and `Create N tickets` (label updates with valid count).
- "Create" inserts all valid drafts in a single `supabase.from("tickets").insert([...])` call (with `select("id")` returned), then bulk-inserts `ticket_assignees` rows for any drafts that had assignments. On success: toast, close dialog, `reload()`.
- Validation: rows with empty title are skipped (greyed out, "Title required" hint). Disable Create when zero valid rows.
- Keyboard: Enter in title field on the last row → adds another row. Cmd/Ctrl+Enter anywhere → submit.

## Implementation

**New file**: `src/features/tickets/AddTicketsDialog.tsx`
- Props: `{ open, onOpenChange, projectId, onCreated }`.
- Loads `project_members` once (with joined `team_members`) for the assign popover, mirroring `AssignDialog`'s query.
- Loads statuses via existing `useStatuses()` hook.
- Internal `Draft` type holds title/type/epic_id/status_id/fe/be/proj/assignees{fe,be,project: Set<string>}.
- Submit:
  1. Build `payload` array (filter valid drafts) with same field shape as `QuickAddRow.submit` plus `status_id` and project estimates; let trigger fill `ticket_number`/`formatted_id`.
  2. `insert(payload).select("id")` to get new ticket IDs in order.
  3. Build `ticket_assignees` rows from drafts that have any selections, paired with returned IDs by index.
  4. `insert(assigneeRows)` if any.
  5. Toast success, call `onCreated()`, close.

**Edit**: `src/features/tickets/ProjectTickets.tsx`
- Add `addOpen` state.
- Replace the PMBA `Import CSV` button (lines ~450-454) with a button group:
  - Primary `Button` "Add ticket" (Plus icon) → `setAddOpen(true)`
  - `DropdownMenu` trigger (chevron icon button, same height) with one item "Import from CSV…" → `setImportOpen(true)`
- Render `<AddTicketsDialog open={addOpen} onOpenChange={setAddOpen} projectId={projectId} onCreated={reload} />` near the existing import Dialog.
- Keep all existing CSV import logic untouched.

**Reused components** (no changes): `EpicSelect`, `useStatuses`, `MemberAvatar`, `Dialog`, `Select`, `DropdownMenu`, `Popover`.

## Out of scope

- Editing CSV import flow itself.
- Changing `QuickAddRow` (per-column inline add stays).
- Permission changes — gating mirrors current `isPMBA(role)` check.
