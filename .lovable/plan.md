# Allow Standard/CR sub-tickets end-to-end (DB + CSV + in-app UI), add a real parent FK, fix child `formatted_id` formatting

One migration + frontend tweaks. UI widening is now in-scope (per request) so the full flow lands together.

## 1. Fix `formatted_id` for child tickets (the dash)

Children currently render as `COUT007:01` while parents render as `COUT-007`. The trigger already builds the child as `parent.formatted_id || ':NN'`, so this is purely legacy data from before parents had a dash. Backfill in the migration:

```sql
UPDATE public.tickets c
   SET formatted_id = p.formatted_id || ':' || LPAD(c.bug_sub_number::text, 2, '0')
  FROM public.tickets p
 WHERE c.parent_ticket_id = p.id
   AND c.bug_sub_number IS NOT NULL
   AND c.formatted_id IS DISTINCT FROM p.formatted_id || ':' || LPAD(c.bug_sub_number::text, 2, '0');
```

## 2. Add a real FK on `tickets.parent_ticket_id`

Today the column is plain `uuid` — only the trigger blocks garbage IDs. Add:

```sql
-- Defensive backfill before the FK
UPDATE public.tickets t
   SET parent_ticket_id = NULL, bug_sub_number = NULL
 WHERE parent_ticket_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.tickets p WHERE p.id = t.parent_ticket_id);

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_parent_ticket_id_fkey
  FOREIGN KEY (parent_ticket_id) REFERENCES public.tickets(id)
  ON DELETE SET NULL;
```

`ON DELETE SET NULL` is a backstop — the existing `detach_bug_children_before_parent_delete` BEFORE-DELETE trigger runs first and rewrites each child's `formatted_id` back to `ACR-NNN`.

## 3. Loosen the trigger so Standard / CR can also be sub-tickets

Rewrite `enforce_bug_parent` (keep the name so the trigger binding stays intact):

- Allow `Standard`, `CR`, and `Bug` as children.
- Reject `Proj` as a child (`Proj tickets cannot have a parent`).
- Parent must still be `Standard` or `CR` (unchanged).
- `bug_sub_number` + `formatted_id := parent.formatted_id || ':' || LPAD(...)` logic unchanged — now produces correct dashed IDs for all child types.

## 4. CSV importer (`src/features/tickets/project-tickets/useTicketsCsvImport.ts`)

- Drop the "Parent only valid for Bug rows" guard.
- Reject `Parent Ticket #` on `Proj` rows.
- Validate resolved parent's `ticket_type` is `Standard` or `CR`.
- Payload: `parent_ticket_id: r.type !== "Proj" && r.parent_ticket_number != null ? ... : null`.
- Add a Standard sub-ticket example row to `downloadTicketsTemplate`.

## 5. Import dialog hint (`ImportCsvDialog.tsx`)

Update copy to: "Parent Ticket # links any Standard/CR/Bug row to a Standard or CR parent; not allowed on Proj rows."

## 6. In-app add-ticket UI — widen parent picker to Standard / CR / Bug

`ParentTicketSelect` already filters its options to Standard/CR parents (no change needed). The gates that currently hide the picker for non-Bug children are in four spots — widen each from `type === "Bug"` to `type !== "Proj"`:

- **`src/features/tickets/QuickAddRow.tsx`**
  - Replace `const isBug = type === "Bug"` with `const canHaveParent = type !== "Proj"` and rename references (`isBug ? parentTicketId : null` → `canHaveParent ? parentTicketId : null`; render condition `{isBug && (...)}` → `{canHaveParent && (...)}`; `!(isBug && parentTicketId)` → `!(canHaveParent && parentTicketId)`).
  - On line ~146 (`if (nt !== "Bug")` — currently clears the parent when switching away from Bug), change to `if (nt === "Proj")` so switching among Standard/CR/Bug preserves the picked parent, and switching to Proj clears it.
  - `postBugLinkComment` call: keep firing for any child type (rename is cosmetic; out of scope here — the comment body still reads correctly for non-Bug children, since it just links parent ↔ child).

- **`src/features/tickets/add-dialog/useDraftRows.ts`**
  - Line 87: `parent_ticket_id: d.type === "Bug" ? d.parentTicketId : null` → `parent_ticket_id: d.type !== "Proj" ? d.parentTicketId : null`.
  - Line 138: `if (!d || d.type !== "Bug" || !d.parentTicketId) return` → `if (!d || d.type === "Proj" || !d.parentTicketId) return` so the link-comment runs for any child type.

- **`src/features/tickets/add-dialog/DraftRow.tsx`** — same gate-widening for showing the parent picker column (`type !== "Proj"` instead of `type === "Bug"`).

- **`src/features/tickets/detail/TicketDetailBody.tsx`** — lines 81 & 101: replace `ticket.ticket_type === "Bug"` with `ticket.ticket_type !== "Proj"` so PMBA can edit, and non-PMBA can view, the parent link for Standard/CR/Bug children.

Copy tweaks (e.g. labels still saying "Bug parent") are intentionally minor — I'll update visible labels where they appear in the same JSX blocks I'm already editing, but won't do a project-wide string sweep in this pass.

## Verification

- Existing legacy child rows (e.g. `COUT007:01`) now read `COUT-007:01`.
- Inserting a Proj row with `parent_ticket_id` → trigger raises.
- Inserting a row with a bogus UUID parent → FK violation (was silently allowed before).
- CSV import with a Standard child of `#12` → lands as `ACR-012:01`.
- In-app: create a Standard ticket via Quick Add and via the multi-row Add dialog, pick a Standard parent → child gets `ACR-NNN:01`, parent link is editable on the detail page.
- Switching a draft row's type between Standard / CR / Bug preserves the chosen parent; switching to Proj clears it.
- Deleting a parent still rewrites children's IDs back to `ACR-NNN` via the existing detach trigger.

## Risks

- **GitHub sync** (`github-sync-ticket/index.ts`): each sub-ticket already syncs as its own issue; will grep before writing the migration to confirm nothing special-cases "Bugs are the only sub-tickets."
- **Link comment wording** (`postBugLinkComment`): the helper still has "Bug" in its name and likely in the comment body. Functional, but a future rename pass is warranted.
