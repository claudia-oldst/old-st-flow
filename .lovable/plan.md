## Why this happened

`src/features/tickets/RequestMoreTimeDialog.tsx` inserts every revision with `status: 'approved'`, `decided_by: user.id`, `decided_at: now()` and immediately patches `tickets.current_*_estimate` — regardless of the submitter's role. So when Dennis (a dev) used the "Adjust estimate" flow, his revision skipped the PMBA review queue and updated the ticket right away.

Intended behavior per `docs/pages/estimate-revisions.md` and `ProjectChangeRequests.tsx`: PMBA reviews pending revisions; only PMBA approvals mutate the ticket estimate.

## Fix

Make auto-approval role-aware inside `RequestMoreTimeDialog`.

1. Add a `projectId: string` prop to `RequestMoreTimeDialog` (all 6 call sites already have it — `LogTimeWithCapacityCheck`, `LogTimeModal`, `EditTimeLogDialog`, `StartGroupTimerDialog`, `StopGroupTimerDialog`, `TicketDetailSheet`). Pass it through.
2. Inside the dialog, resolve `const role = useProjectRole(projectId); const canAutoApprove = isPMBA(role);`
3. Change `submit()`:
   - Always insert into `ticket_estimate_changes`.
   - If `canAutoApprove`: keep current behavior — `status: 'approved'`, set `decided_by`/`decided_at`, then patch the ticket's `current_*_estimate`. Toast: "Estimate updated: X → Y".
   - Else (dev/QA/etc.): insert `status: 'pending'`, omit `decided_by`/`decided_at`, do NOT patch the ticket. Toast: "Estimate revision submitted for PMBA approval". Close dialog.
4. UI adjustments when `!canAutoApprove`:
   - Change dialog title from "Adjust estimate" to "Request estimate change".
   - Submit button label: "Submit for approval".
   - Replace the `previous → next` preview with `previous → previous + additional (pending)` styled as pending (dim/italic) to signal it's not yet applied.
   - Keep the "Used so far" line.
5. Downstream consequence to call out to the user (no code change needed): because devs' revisions stay pending, the ticket's remaining capacity is unchanged, so the capacity guard in `useLogTime`/`LogTimeWithCapacityCheck` will still block logging past the current estimate until a PMBA approves the pending row in Estimate Revisions. This is the correct workflow.

## Out of scope

- `useTicketEditor.handleSaveEdit` also inserts approved rows, but it is only reachable from the PMBA-only ticket edit path — leave it as-is.
- No DB / RLS / migration changes. `ticket_estimate_changes` already supports `pending` and PMBA approval via `ProjectChangeRequests`.
- No changes to timers, log-time UI, or the two-field duration input.

## Verification

- As a dev: open a ticket, trigger Adjust estimate, submit +2h with a reason → new row in `ticket_estimate_changes` with `status='pending'`, ticket estimate unchanged, toast says "submitted for approval". PMBA sees it in `/projects/:id/change-requests` and can Approve/Reject.
- As PMBA: same flow still auto-approves and bumps `current_*_estimate` immediately (unchanged behavior).
- Regression: dev still cannot log time exceeding remaining capacity while their revision is pending (existing guard).
