# Sticky manual project status

Once a PMBA sets a ticket's project status by hand, FE/BE discipline changes should stop rewriting it — no more snapping back to a derived status like DEV DONE when the devs finish.

## Current behaviour

The `derive_project_status` trigger clears the manual flag as soon as `fe_status` or `be_status` changes:

```text
manual set  -> project_status_override = true
dev changes FE/BE -> override reset to false -> status re-derived from rules
```

That reset is what moves a ticket in FOR QA (ON STAGING) back to DEV DONE (FOR DEPL.).

## Change

- Remove the auto-clearing of `project_status_override` on FE/BE changes. A manual status stays until someone explicitly releases it.
- With the flag still true, the trigger returns early and leaves `status_id` untouched, so discipline statuses keep updating independently and the board/discipline view still works.
- Releasing the lock stays exactly as it is today: the "Auto" button in the ticket detail Status block sets `project_status_override = false`, and the status re-derives from the rules immediately.
- Applies only to tickets with a manual status; purely auto-derived tickets are unaffected.

## Technical detail

Single migration replacing `public.derive_project_status()`: drop the `IF fe_or_be_changed AND NEW.project_status_override THEN NEW.project_status_override := false;` block. Everything else (Proj-ticket skip, rule matching, `flag_project_status_override` trigger) is unchanged. No frontend changes needed — the "Manual override" pill and "Auto" reset button already exist in `StatusBlock.tsx`.

Existing tickets are not migrated; they simply keep their current flag value.
