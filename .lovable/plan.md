# Only newly added people join the selected sprint

## Finding

The current code already behaves this way — verified in source:

- `AssignDialog.tsx` computes a diff (`toAdd` / `toRemove`) against the ticket's current assignees and passes **only** `toAdd` to `syncSprintCommitments`. Existing assignees who stay selected are never re-committed to the chosen sprint.
- `useBulkAssign.ts` does the same: `buildAssignmentDiff` produces `inserts`/`deletes`, and only `inserts` are committed to the selected sprint.
- `syncSprintCommitments` only inserts sprint rows for the `added` list and only deletes rows for people explicitly removed — and only in the selected sprint.

## What to do

1. Add a focused unit test for `syncSprintCommitments` proving:
   - only newly added FE/BE assignees get a `sprint_tickets` row in the selected sprint;
   - pre-existing assignees are untouched (no insert, no delete);
   - removed assignees only lose their row in the selected sprint, nowhere else.
2. Add/adjust a diff test for `buildAssignmentDiff` (bulk) confirming unchanged assignments produce no inserts.
3. Manually verify in the preview: assign person A with Sprint 1, reopen, add person B with Sprint 2 — A stays only in Sprint 1, B lands in Sprint 2.

## Technical notes

- Files: `src/features/tickets/assign/syncSprintCommitments.ts`, `src/features/tickets/bulk-assign/bulkAssignOps.ts` (tests only, no logic changes expected).
- No UI, schema, or RLS changes.
