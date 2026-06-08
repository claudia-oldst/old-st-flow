## Goal

Stop auto-listing every FE/BE/Fullstack project member under each sprint in the Forecasting Calendar. Instead, each sprint starts with no member rows; the PMBA explicitly adds members one at a time via a "+ Project Member" button, then sets FE/BE hours inline (current behavior). Members can also be removed from a sprint.

## Behavior

- A sprint row shows only members the PMBA has added to that specific sprint.
- Below the member list, a `+ Project Member` button (PMBA only) opens a small picker (popover/command list, like the "create ticket" assignee picker) showing project devs not yet added to this sprint.
- Selecting a member adds them to the sprint and renders their row with FE/BE inputs (disciplines they can take, others disabled, as today).
- Each member row gets a small remove (×) control (PMBA only) that removes them from the sprint.
- Hours are still edited inline and committed on blur, identical to today.
- Non-PMBA users see the read-only list of added members and their hours; no add/remove controls.

## Data model

No schema change. Reuse `sprint_capacities`:

- "Added to sprint" = at least one `sprint_capacities` row exists for `(sprint_id, user_id)` across any discipline (FE/BE).
- Adding a member = insert one zero-hour `sprint_capacities` row (FE for Frontend/Fullstack, BE for Backend) so the row is durably present even before any hours are entered.
- Removing a member = delete all `sprint_capacities` rows for `(sprint_id, user_id)`.
- Existing capacity rows in production already imply "added", so legacy sprints continue to show their members correctly.

## Files to change

- `src/features/sprints/ForecastingCalendar.tsx`
  - `SprintRow`: derive `addedMembers` from `capacities` (unique `user_id`s) joined against `devMembers` to get role/name. Render only those rows.
  - Add `AddSprintMemberButton` (new small component in this file or alongside) using `Popover` + `Command` (existing shadcn) listing project devs not yet added; on select, insert a zero-hour capacity row for their primary discipline and invalidate `sprint_capacities`.
  - Add a remove (×) icon button per member row (PMBA only) that deletes all `sprint_capacities` for that `(sprint_id, user_id)`.
  - Keep `CapInput` / `updateCap` exactly as-is for inline hours editing.
- No changes to `SprintWorkbench.tsx` lane rendering for now; lanes there are driven by `devMembers` (project membership). If the user wants lanes restricted to "added" members too, that is a follow-up — out of scope per this request which is about the Forecasting Calendar.

## UX details

- Empty state when no members added: a single muted line "No members added" above the `+ Project Member` button.
- Picker shows `name · role`, hides anyone already added, hides non-dev roles (PMBA/QA/Design) since they have no FE/BE capacity.
- Button styling matches existing small outline buttons in the calendar (e.g. "Append next sprint block").
