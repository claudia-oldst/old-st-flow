# Block log time when over estimate

When a user opens `LogTimeModal` for a ticket where their discipline (FE/BE/Project) has already burned through the available estimate, intercept and force them through `RequestMoreTimeDialog` (re-titled "Adjust estimate") first. Once they save the estimate increase, automatically continue into the LogTimeModal.

## Rule

For the chosen discipline `D`:
- `actual_D` = `actual_frontend_hours` / `actual_backend_hours` / `actual_project_hours`
- `current_D` = `current_fe_estimate` / `current_be_estimate` / `current_project_estimate`
- `pending_delta_D` = sum of `(new_hours - previous_hours)` from `ticket_estimate_changes` where `ticket_id = ticket.id`, `discipline = D`, `status = 'pending'`
- `available_D = current_D + pending_delta_D`

Block when:
- Live timer tab: `actual_D >= available_D` (already at/over capacity).
- Manual entry tab: `actual_D + entered_hours > available_D`.

When blocked, show inline notice + a primary "Adjust estimate" button instead of "Start timer" / "Log hours". Clicking opens `RequestMoreTimeDialog` pre-filled with the current discipline. On save, dialog closes and LogTimeModal stays open with focus returned to the action button (now unblocked because `current_*_estimate` was bumped).

`Project` discipline: `RequestMoreTimeDialog` currently only handles FE/BE. Extend it to also accept `"Proj"` slot when ticket is a Proj ticket, updating `current_project_estimate` and writing the estimate change row with `discipline = 'Project'`.

## UI

- LogTimeModal header gets a small capacity line under the ticket title: `Used X / Yh (+Zh pending)` for the active discipline, turning coral when over.
- Replace tab footer button with `Adjust estimate` (coral) when blocked. Keep Cancel.
- Manual tab: also live-validate the entered `hours` field; helper text turns coral when the entry would exceed `available_D`.

## Technical

Files to edit:

- `src/features/timelog/log-time/useLogTime.ts`
  - Fetch pending estimate changes for this ticket (one query on `open`, keyed by ticket id) and expose `availableByDiscipline: { FE, BE, Project }` and `actualByDiscipline`.
  - Expose `isOverForTimer` (boolean) and `wouldOverflowManual(hoursStr)` helper.
  - Guard `handleStartTimer` and `handleManualLog` to short-circuit with a toast if called while blocked (defense in depth).

- `src/features/timelog/LogTimeModal.tsx`
  - Render the capacity line.
  - Conditionally render an `Adjust estimate` action when blocked. Manage local `adjustOpen` state; render `RequestMoreTimeDialog` as sibling.
  - On `onSaved` from the adjust dialog: refetch `availableByDiscipline` (expose a `refresh` from the hook) and keep modal open.

- `src/features/tickets/RequestMoreTimeDialog.tsx`
  - Accept `"Proj"` in `allowedSlots` (rename type to `Array<"FE" | "BE" | "Proj">`).
  - Add Proj branch: read `current_project_estimate` / `actual_project_hours` (passed via new `currentProj`/`actualProj` props), patch `current_project_estimate`, insert change with `discipline: 'Project'`.
  - Title remains "Adjust estimate".

No DB schema changes needed.
