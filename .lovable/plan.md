# Sticky manual project status + no bulk re-apply

Two related safeguards for live projects:

1. Once a PMBA sets a ticket's project status by hand, FE/BE discipline changes no longer rewrite it. It stays until someone explicitly resets it to Auto.
2. The ability to bulk re-evaluate status rules is removed — rules only affect a ticket at creation and when its FE/BE statuses change. Nothing retroactively sweeps existing tickets.

## 1. Sticky manual project status

### Current behaviour
The `derive_project_status` trigger clears the manual flag whenever `fe_status` or `be_status` changes:

```text
manual set -> project_status_override = true
dev changes FE/BE -> override reset to false -> status re-derived from rules
```

That reset is what moved a ticket in FOR QA (ON STAGING) back to DEV DONE (FOR DEPL.) when the devs set both disciplines to `done`.

### Change
Remove the auto-clearing of `project_status_override` on FE/BE changes. With the flag still true, the trigger returns early and leaves `status_id` untouched, so discipline statuses keep updating independently and the board/discipline view still works.

Releasing the lock is unchanged: the "Auto" button in the ticket detail Status block sets `project_status_override = false`, and the status immediately re-derives from the rules.

## 2. Remove bulk re-apply

### Current behaviour
- Admin > Status rules has a **Re-evaluate now** button that calls the `reapply_status_rules` RPC.
- That RPC touches every non-Proj ticket with `project_status_override = false`, firing `derive_project_status` on each one and forcing their statuses to match the current rules.
- The same RPC also auto-runs after every rule edit, reorder, delete, and "Reset defaults".

### Change
- Remove the **Re-evaluate now** button from the Admin UI.
- Drop the `reapply_status_rules` RPC from the database.
- Stop calling it automatically after rule edits/reorder/delete/reset. Saving a rule change now only affects tickets going forward (new tickets and tickets whose FE/BE statuses change next), never a bulk sweep.
- Keep the live **Preview matrix** and rule editing — those don't touch tickets.

## Files / scope

| What | Where |
|---|---|
| Rewrite `derive_project_status()` to drop the override-clearing block | migration |
| Drop `reapply_status_rules()` | migration |
| Remove "Re-evaluate now" button + `reapply()` calls | `src/features/admin/StatusRulesAdmin.tsx` |
| Update the copy describing manual override behaviour | `StatusRulesAdmin.tsx` + `docs/pages/admin-status-rules.md` |
| Mock client | `src/mock/mock-client.ts` (remove `reapply_status_rules` case) |

No change to `flag_project_status_override` or the board's drag-to-set logic. Existing tickets keep their current flag values; no data migration.

## Technical detail

Single migration:
- `CREATE OR REPLACE FUNCTION public.derive_project_status()` removing the `IF fe_or_be_changed AND NEW.project_status_override THEN NEW.project_status_override := false;` block (trigger unchanged).
- `DROP FUNCTION IF EXISTS public.reapply_status_rules();`
