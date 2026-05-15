# Block log time when over estimate

When a user tries to log time on a ticket where their discipline has already burned through the available estimate (current estimate + pending estimate-revision deltas), force them through the **Adjust Estimate** dialog (existing `RequestMoreTimeDialog`) before they can log. On save, continue into the originally intended action.

## Capacity rule

For chosen discipline `D` (FE / BE / Project) on a ticket:

- `actual_D` = `actual_frontend_hours` / `actual_backend_hours` / `actual_project_hours`
- `current_D` = `current_fe_estimate` / `current_be_estimate` / `current_project_estimate`
- `pending_delta_D` = sum of `(new_hours - previous_hours)` from `ticket_estimate_changes` where `ticket_id = ticket.id`, `discipline = D`, `status = 'pending'`
- `available_D = current_D + pending_delta_D`

A log/start attempt is **blocked** when it would push `actual_D` past `available_D`.

## Single-ticket flow (Log Time button / Play)

Intercept early — do not show the Log Time modal first if already over.

1. User clicks Play / Log time on a ticket.
2. Resolve discipline `D` (same default-discipline logic as `useLogTime`).
3. If `actual_D >= available_D`:
   - Open **Adjust Estimate** dialog directly, prefilled with `D` and a hint line: *"Used {actual_D}h of {available_D}h. Add more hours to log against this ticket."*
   - On Cancel: stop, no modal.
   - On Save: dialog closes, then automatically open **Log Time** modal for the same ticket / discipline.
4. Otherwise: open Log Time modal as today.

Inside Log Time modal (manual tab), keep live validation:

- Show capacity line under the title: `Used {actual_D} / {available_D}h (+{pending_delta_D}h pending)`. Coral when at/over.
- If `actual_D + entered_hours > available_D`: helper text turns coral and the **Log hours** button is replaced by **Adjust estimate**, which opens `RequestMoreTimeDialog`. On save, the modal stays open with the now-valid hours and the button reverts to **Log hours**.
- Live timer tab: unreachable in blocked state because we intercepted before opening; no extra UI here.

## Group timer flow

Hours aren't allocated to specific tickets until stop, so apply checks at both ends.

### Start (StartGroupTimerDialog)

- In the ticket picker, render a small coral `over` pill next to any ticket where `actual_D >= available_D` for the user's currently-selected discipline. Tooltip: `used / available (+pending)`.
- Tickets remain selectable.
- When user clicks **Start**, if any selected ticket is over capacity, show a compact pre-flight panel listing them. Each row has an inline **Adjust** button opening `RequestMoreTimeDialog` for that ticket + discipline. **Start** button stays disabled until every flagged row has been adjusted (refetch clears it) or de-selected.

### Stop (StopGroupTimerDialog)

- After the user splits/edits hours per ticket, validate per row: `actual_D + row_hours > available_D` ⇒ row turns coral and shows an inline **Adjust estimate** action.
- **Save** is disabled until each offending row has been adjusted or its `row_hours` lowered enough to fit.
- Other rows in the group remain saveable.

## RequestMoreTimeDialog updates

Currently handles FE / BE only. Extend for Project discipline:

- Accept `Array<"FE" | "BE" | "Proj">` in `allowedSlots`.
- Add a Proj branch that reads `current_project_estimate` / `actual_project_hours` (new optional `currentProj`/`actualProj` props) and writes the change with `discipline: 'Project'`, patching `current_project_estimate`.
- Add an optional `helperText` prop so callers can show the "Used X of Y, add more to log" context line at the top.
- Add an optional `onSavedContinue` callback distinct from the existing `onSaved` so the single-ticket flow can chain straight into Log Time on Save.

## Technical

Files to edit:

- `src/features/timelog/log-time/useLogTime.ts`
  - Fetch pending estimate-change deltas for the ticket on `open`, expose `availableByDiscipline`, `actualByDiscipline`, and a `refresh()`.
  - Add helpers `isOverForDiscipline(D)` and `wouldOverflowManual(hoursStr, D)`.
  - Defensively guard `handleStartTimer` / `handleManualLog` with the same check.

- `src/features/timelog/LogTimeModal.tsx`
  - Render capacity line and the manual-tab "Adjust estimate" CTA + RequestMoreTimeDialog as sibling.
  - Refresh availability on RequestMoreTimeDialog `onSaved`.

- New shared hook `src/features/timelog/useTicketCapacity.ts` (or colocated helper)
  - Given a list of `ticket_id`s + discipline mapping, returns `{ ticketId: { actual, current, pendingDelta, available } }`. Used by both single and group flows.

- `src/features/tickets/TicketCard.tsx` and `src/features/tickets/list/TicketsListRow.tsx`
  - Replace direct LogTimeModal open with a small wrapper that runs the capacity check first; if over, open `RequestMoreTimeDialog` and chain into LogTimeModal on save. Both files already render LogTimeModal as a sibling — extend that pattern with an Adjust dialog state.

- `src/features/timelog/start-group/StartGroupTicketsList.tsx` + `useStartGroup.ts`
  - Add `over` pill per row using `useTicketCapacity`.
  - In `useStartGroup`, expose `blockedTickets` (selected ∩ over) and disable Start when non-empty.
  - Render pre-flight panel in `StartGroupTimerDialog` with inline Adjust buttons.

- `src/features/timelog/stop-group/RowsList.tsx` + `useStopGroup.ts`
  - Per-row capacity check against the user's discipline at this ticket; coral state + Adjust action; block Save while any row offends.

- `src/features/tickets/RequestMoreTimeDialog.tsx`
  - Add Proj support, `helperText`, and `onSavedContinue` as described.

No DB schema changes required.
