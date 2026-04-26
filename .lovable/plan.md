## Add `Proj` ticket type with shared Project estimate

A fourth ticket type for ongoing project work (e.g. "Development Meetings"). Unlike Standard/Bug/CR which split work across FE/BE, a Proj ticket has one shared estimate. Anyone assigned can log to the same pool, and totals appear as `8/40, 10/40` style on a single bar.

### Behaviour

- **New ticket type**: `Proj` (alongside Standard / Bug / CR).
- **Card icon**: black "P" dot in the top-right corner (mirroring how the FE/BE chip badge sits on discipline cards).
- **Estimate**: one number — `current_project_estimate` / `original_project_estimate`. No FE or BE estimate fields shown.
- **Assignees**: any project member can be assigned (single "Members" slot, no FE/BE/Other split).
- **Time logging**: always logs to a new `Project` discipline. Bar shows pooled total across all users vs the project estimate.
- **Status**: only one status track (project status). The FE/BE discipline status concept does not apply.

### Database changes (migration)

1. Extend enums:
   - `ticket_type` → add `'Proj'`.
   - `log_discipline` → add `'Project'`.
   - `assignee_slot` → add `'Project'` (used for Proj-ticket assignments so the existing validation trigger doesn't reject them).

2. `tickets` table — add columns:
   - `original_project_estimate numeric NOT NULL DEFAULT 0`
   - `current_project_estimate numeric NOT NULL DEFAULT 0`
   - `actual_project_hours numeric NOT NULL DEFAULT 0`

3. Update `apply_time_log` trigger to also handle `discipline = 'Project'`, accumulating into `actual_project_hours`.

4. Update `validate_ticket_assignee` so the new `Project` slot is allowed for any project member regardless of role.

5. Update `derive_project_status` so Proj tickets aren't forced through FE/BE rules — for `ticket_type = 'Proj'` skip the derive logic entirely (status stays whatever it was set to manually, defaulting to backlog on insert which is already handled by `before_ticket_insert`).

### Frontend changes

**Types & helpers**
- `src/lib/types.ts`: nothing to change manually — generated `types.ts` will pick up the new enums after the migration.
- `src/lib/utils.ts`: `displayTitle` — no prefix for `Proj` (just the title).

**Ticket card** (`TicketCard.tsx`)
- Add a `TypeIcon` branch: for `Proj`, render a filled black "P" badge in the top-right corner of the card (small rounded chip, similar styling to the FE/BE corner badge in `DraggableDisciplineCard`).
- For Proj tickets: hide FE/BE chips and FE/BE bars. Render a single `Bar` with label `Project`, `actual = actual_project_hours`, `estimate = current_project_estimate`.
- Assignees footer: show a single group (no FE/BE/O split) — just avatars under a "Team" label.

**Ticket detail sheet** (`TicketDetailSheet.tsx`)
- For `Proj` tickets: hide the FE/BE Discipline status panel. Keep the Project status block.
- Estimates section: show one "Project" stat / one editable input instead of FE+BE.
- Assignees section: show a single "Members" block instead of FE/BE/Other.
- Estimate change auditing: log against `discipline = 'Project'`.
- Permissions for editing the project estimate / logging time: anyone assigned to the ticket, plus PMBA.

**Assign dialog** (`AssignDialog.tsx`)
- Accept a `ticketType` prop. When `Proj`, render only one `SlotPicker` ("Team members") that writes to the new `Project` slot. All project members are eligible.
- Pass `ticketType` from `TicketDetailSheet`.

**Quick add** (`QuickAddRow.tsx`)
- Add `Proj` to the type select.
- When `Proj` is chosen, swap the FE/BE inputs for a single "Project estimate" input that maps to `current_project_estimate` / `original_project_estimate`.

**Log time modal** (`LogTimeModal.tsx`)
- For Proj tickets: force `discipline = 'Project'`, hide the FE/BE/Overhead toggle, show "Logging to Project hours."
- Anyone assigned to the ticket can log (no role/slot gating beyond assignment).

**Group timer dialogs**
- `StartGroupTimerDialog.tsx`: add `Proj` to the type filter buttons. When the user picks Project discipline (new option for everyone), the list shows tickets where they're assigned to the Project slot.
- `StopGroupTimerDialog.tsx`: handle `discipline = 'Project'` in the header label; status select is hidden (no FE/BE status concept for Proj tickets).
- `LogDiscipline` toggle in start dialog: add a "Project" option that's available regardless of role, but only when the user has at least one Proj-ticket assignment.

**Timer chip / sync** (`TopBar.tsx`, `TimerSync.tsx`): no structural changes — the new discipline value flows through automatically once the type allows it.

**Other ticket views** (`TicketsList.tsx`, `TicketsFilter.tsx`, `BulkAssignDialog.tsx`, `BulkActionsBar.tsx`, `MyWork.tsx`): add `Proj` to type filters/labels and render the project bar in places that currently show FE/BE breakdown.

### Open questions / defaults assumed

- Card "P" badge: black background with white "P", same shape as the discipline `FE`/`BE` corner badge.
- For Proj tickets, the project status auto-derive is skipped — PMBA sets status manually (Backlog → Active → Done). When time is first logged on a Proj ticket in Backlog, we still auto-promote to the first Active status (mirrors current behaviour).
- Existing FE/BE columns (`current_fe_estimate`, etc.) are simply ignored on Proj tickets, kept at 0.
