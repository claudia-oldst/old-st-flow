## Goal

A ticket's `fe_status` / `be_status` should be **null** when no one is assigned to that discipline. With both sides null, the ticket derives to **BACKLOG**.

## Current state (verified)

- `tickets.fe_status` / `be_status` are `NOT NULL DEFAULT 'todo'`.
- `derive_project_status()` matches rules on concrete `discipline_status` values — nulls never match, so a null side would leave `status_id` unchanged (bad on INSERT where `status_id` is null).
- The `fe=todo AND be=todo` rule still points to **TO DO**, not **BACKLOG**.

## Migration

1. **Make columns nullable, drop the default.**
   ```sql
   ALTER TABLE public.tickets
     ALTER COLUMN fe_status DROP NOT NULL,
     ALTER COLUMN fe_status DROP DEFAULT,
     ALTER COLUMN be_status DROP NOT NULL,
     ALTER COLUMN be_status DROP DEFAULT;
   ```

2. **Backfill: null out sides with no assignee.**
   ```sql
   UPDATE public.tickets t SET fe_status = NULL
   WHERE fe_status IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM ticket_assignees a WHERE a.ticket_id = t.id AND a.slot = 'FE');
   -- same for BE
   ```

3. **Update `derive_project_status()`** so a null side is treated as `'todo'` for rule matching (keeps existing rule semantics working). Both sides null then matches the todo+todo rule → routes to BACKLOG.

4. **Repoint the todo+todo rule to BACKLOG** (position 2 rule currently targets TO DO — id `c1a82ec5-93c8-4b7b-8ce5-08a2032ec1e5` is BACKLOG).

5. **Assignee sync trigger on `ticket_assignees`** (AFTER INSERT/DELETE):
   - On insert of an FE assignee: if `tickets.fe_status IS NULL`, set it to `'todo'`.
   - On delete of the last FE assignee for a ticket: set `fe_status = NULL`.
   - Same for BE. Then touch `updated_at` so `derive_project_status` re-runs.

6. **Reapply:** `SELECT public.reapply_status_rules();` to shift existing tickets.

## Code changes

- `src/features/tickets/add-dialog/useDraftRows.ts` and `src/features/tickets/QuickAddRow.tsx`: no changes needed — the DB default is gone, so inserts that don't set fe/be_status will store null and derive to BACKLOG.
- `src/integrations/supabase/types.ts` regenerates after the migration; any spot that assumed non-null `fe_status`/`be_status` for display already tolerates unknown values via the discipline-status label map lookups (verify at consumer sites: `StatusBadge`, board columns, dev columns — treat null as "todo" for rendering only).

## Out of scope

Rule editor UI, Proj-type tickets (skipped by the trigger already), manual overrides.
