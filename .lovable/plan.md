## Why nothing snapped

`snap_estimates_on_dev_done_trg` and `trim_estimates_on_done` are declared as:

```text
BEFORE INSERT OR UPDATE OF status_id ON public.tickets
```

Postgres decides whether an `UPDATE OF <col>` trigger fires from the **columns named in the UPDATE statement**, not from what other triggers change. When a dev flips a discipline status, the app runs `UPDATE tickets SET fe_status = ... / be_status = ...`. `derive_project_status_trg` (which is armed on `fe_status, be_status`) then sets `NEW.status_id` to DEV DONE inside the same row — but that does not re-arm the snap trigger, so it never runs.

That's why the only auto-snap rows in the database are from Project Pulse: those came from PMBAs clicking the status pill directly (`UPDATE tickets SET status_id = ...`), which does name the column.

Verified: all 11 Draper tickets in DEV DONE (FOR DEPL.) still carry their pre-snap estimates (e.g. DRA-002 8h FE est / 7.33h actual, DRA-007 5h BE est / 2.75h actual), and `ticket_estimate_changes` has zero auto rows for Draper.

## The fix

**1. Migration — re-arm both triggers on any UPDATE**

Drop and recreate `snap_estimates_on_dev_done_trg` and `trim_estimates_on_done` without the `OF status_id` column list:

```text
BEFORE INSERT OR UPDATE ON public.tickets
BEFORE UPDATE ON public.tickets
```

No function-body changes needed — both already early-return when `status_id` is NULL or unchanged (`NEW.status_id IS NOT DISTINCT FROM OLD.status_id`), and when the old status was already in the same category. So the wider arming costs one cheap comparison per ticket update and cannot double-snap.

**2. Data fix — backfill Project Draper only**

For Draper tickets currently in a `dev done` or `done` category status, where actuals are below the current estimate:

- Insert `ticket_estimate_changes` audit rows per discipline (FE / BE / Project) with `reason = 'Auto-snapped at Dev Done (backfill)'`, `status = 'approved'`, attributed to the ticket's most recent time logger, falling back to its first assignee; skip the audit row when no team member can be resolved (matches the trigger's own guard).
- Then set `current_fe_estimate` / `current_be_estimate` / `current_project_estimate` down to the corresponding actuals for those rows.

Expected affected tickets: DRA-001 (FE 2→1.5), DRA-002 (FE 8→7.33, BE 8→4), DRA-004 (FE 1→1), DRA-007 (FE 4→3.5, BE 5→2.75), DRA-008 (FE 4→2.5, BE 6→3.5), DRA-010 (FE 2→1.5, BE 4→3), DRA-011 (FE 1→0.75). Tickets where actuals already meet or exceed the estimate are untouched.

## Notes

- No frontend changes — the Health, portal and ticket views read these columns directly.
- Other projects are left as-is per your choice; the trigger fix means any future Dev Done transition there snaps correctly.
