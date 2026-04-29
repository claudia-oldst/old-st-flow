# Snap estimates to actuals on Done

When a ticket's project-level status transitions into the **Done** category, automatically reduce any **inflated estimates** (FE / BE / Project) so that `current_*_estimate = actual_*_hours`. Each adjustment is recorded in `ticket_estimate_changes` so it shows up in the existing audit history exactly like a manual "Adjust estimate" action.

## Behavior

For each of the three disciplines (FE, BE, Project) on the ticket being closed:
- If `current_estimate > actual_hours`, set `current_estimate = actual_hours` and insert an audit row.
- If `actual >= current` (estimate already met or exceeded), leave it alone — we never inflate estimates upward here.
- If `actual = 0` and `current = 0`, skip (nothing to log).

Triggers on:
- Any status change where the **new** status has `category = 'done'` and the **old** status did not (i.e. real transitions into Done — re-saving an already-Done ticket does nothing).

This covers all UI paths uniformly (kanban drag, detail sheet, bulk actions, board) since they all update `tickets.status_id`.

## Audit log shape

For each trimmed discipline, insert into `ticket_estimate_changes`:
- `discipline`: `'FE'` | `'BE'` | `'Project'`
- `previous_hours`: the old `current_*_estimate`
- `new_hours`: the actual hours (the new estimate)
- `delta`: negative (auto-computed)
- `reason`: `"Auto-trimmed to actuals on completion"`
- `status`: `'approved'`
- `user_id` / `decided_by`: `auth.uid()` if available, else the most recent time-logger on the ticket as a sensible fallback (so the row is never orphaned with NULL).

## Technical implementation

**1. DB migration** — add a `BEFORE UPDATE` trigger on `public.tickets`:

```text
trigger: trim_estimates_on_done
  fires: BEFORE UPDATE OF status_id ON tickets
  function: public.trim_estimates_on_done()
    - resolve old/new status categories from public.statuses
    - if NEW category = 'done' AND OLD category <> 'done':
        for each (FE, BE, Project):
          if current_estimate > actual_hours:
            insert ticket_estimate_changes row (discipline, prev, new=actual, reason, user)
            set NEW.current_*_estimate = actual_*_hours
    - return NEW
```

Function uses `SECURITY DEFINER` + `SET search_path = public` (matches existing trigger patterns). User attribution: `coalesce(auth.uid(), (select user_id from time_logs where ticket_id = NEW.id order by logged_at desc limit 1))`.

**2. Frontend** — no required changes. The existing `useTicketEstimateChanges` hook already lists every row and listens via realtime, so the auto-trim entries will appear in the ticket's estimate history immediately.

Optional polish (small): in the row renderer for estimate history, when `reason` starts with `"Auto-trimmed"`, show a subtle "auto" badge so users can distinguish manual vs. automatic adjustments. I'll include this.

## Files touched

- **New migration**: `trim_estimates_on_done` function + trigger on `tickets`.
- **Edited**: the component that renders estimate-change rows (small visual badge for auto entries) — I'll locate it during implementation (likely inside `TicketDetailSheet.tsx` or a sibling history component).

## Edge cases handled

- Re-opening then re-closing a ticket re-runs the trim (idempotent — if actuals haven't grown past the trimmed estimate, nothing changes; otherwise no row is inserted because `current <= actual`).
- Proj-type tickets: same logic applies; their `status_id` is set manually and the trigger still fires.
- Bulk status updates: trigger fires per row.
- If the new status doesn't exist or has no category, the trigger no-ops safely.