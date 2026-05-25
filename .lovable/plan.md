# Plan: Bug → Parent Ticket Linking

## Behavior

- When creating a **Bug**, user can optionally pick a parent ticket from the same project.
- Parent scope: only **Standard** or **CR** tickets (no Bug→Bug, no Proj parents).
- If a parent is selected:
  - Bug's `formatted_id` becomes `<parent.formatted_id>:NN` (zero-padded 2-digit sequence, scoped to that parent), e.g. `ACR-012:01`, `ACR-012:02`.
  - Bug title prefills to the parent's title (editable).
- If no parent is selected: Bug keeps the normal `ACR-NNN` numbering.
- Parent can be changed/cleared from the **Ticket Detail** sheet (re-derives the formatted_id).
- Parent link is displayed **only in the Ticket Detail sheet** (small chip linking to parent), not on cards.

## Database changes (one migration)

Schema:
- Add `tickets.parent_ticket_id uuid NULL` (self-reference, no FK enforced — keeping pattern of no FKs in this project).
- Add `tickets.bug_sub_number int NULL` (sequence per parent for ordering/regenerating ID).
- Index on `(parent_ticket_id)`.

Trigger updates:
- New trigger `enforce_bug_parent` (BEFORE INSERT/UPDATE on tickets):
  - If `parent_ticket_id IS NOT NULL`:
    - Require `ticket_type = 'Bug'`.
    - Look up parent; require same `project_id` and `ticket_type IN ('Standard','CR')`.
    - On INSERT or when `parent_ticket_id` changed: assign `bug_sub_number = COALESCE(MAX(bug_sub_number),0)+1` among siblings, then set `formatted_id = parent.formatted_id || ':' || LPAD(bug_sub_number::text,2,'0')`.
  - If `parent_ticket_id IS NULL` and `ticket_type = 'Bug'`: clear `bug_sub_number`, regenerate normal `ACR-NNN` formatted_id using project acronym + `ticket_number`.
- Modify `before_ticket_insert`: skip overriding `formatted_id` when parent path applies (let new trigger handle it). `ticket_number` is still assigned as today so the ticket retains a project-wide number for sorting/uniqueness.

## Frontend changes

Shared component:
- `src/features/tickets/ParentTicketSelect.tsx` — searchable select (formatted_id + title), filters to Standard/CR in the current project, excludes self. Used by all three entry points.

Add/Quick Add flow:
- **`add-dialog/types.ts`**: extend `Draft` with `parentTicketId: string | null`.
- **`add-dialog/DraftRow.tsx`**: when `type === 'Bug'`, render `ParentTicketSelect`. On parent selection, autofill `title` with parent title (only if title is empty or matches prior parent's title — avoid clobbering manual edits).
- **`add-dialog/useDraftRows.ts`**: include `parent_ticket_id` in insert payload.
- **`QuickAddRow.tsx`**: same — show parent select when type is Bug, prefill title, send `parent_ticket_id` on insert.

Detail editor:
- **`detail/useTicketEditor.ts`** + the Ticket Detail sheet: add parent picker for Bug tickets (and a chip showing current parent with a clear button). Allow editing parent; on save, update `parent_ticket_id` (trigger re-derives `formatted_id`).
- Display a small "Parent: ACR-012" chip in the detail header for bugs with a parent.

Types:
- After migration, `src/integrations/supabase/types.ts` regenerates automatically — `TicketRow` types pick up new columns; update local interfaces where tickets are mapped.

## Edge cases

- Changing a bug's parent re-issues a new `:NN` under the new parent; the old slot is not reused (simple, predictable).
- Deleting a parent: bugs keep their derived `formatted_id` string but `parent_ticket_id` becomes a dangling uuid. Add a follow-up `BEFORE DELETE` on tickets to null out children's parent + regenerate plain `ACR-NNN` formatted_id.
- CSV import: leave `parent_ticket_id` unset for v1 (out of scope).
- Client portal / exports: no changes needed — they read `formatted_id` as-is.

## Out of scope

- Showing parent on cards/lists (per your choice).
- Bulk re-parenting.
- Bug-of-bug chains.
