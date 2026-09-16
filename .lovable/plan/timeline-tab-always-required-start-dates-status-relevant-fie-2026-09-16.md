# Timeline tab: always-required start dates, status-relevant fields only

Tidy the Timeline tab in Project Settings so it only shows what matters for the chosen status, while the two start dates are always required.

## Always required

- **Project start date** and **Development start date** are required for every lifecycle status. Saving is blocked with an inline message until both are filled, whatever the status.

## Only show relevant fields

The two start dates are always shown. Everything else appears only when the selected status needs it:

| Status | Fields shown |
| --- | --- |
| Pre-live, Confirmed, Definition, In Progress, Completed | Project start date, Development start date |
| Bug-Fixing, Monitor | + Handover date, Closing window date |
| On Hold | + Pause date, Pause reason |
| Closed Lost | + Closed date, Closed reason |

Hidden fields keep any value already saved — they are just not displayed for that status, and reappear when the status changes back.

Required fields stay marked with the existing asterisk and inline error, and the Save button stays disabled until all required fields for the current status are filled. Bug-Fixing keeps requiring handover + closing window, On Hold keeps requiring pause date + reason, Closed Lost keeps requiring closed date + reason — now on top of the two start dates.

Monitor shows the handover and closing window dates (carried over from Bug-Fixing) as read-through/editable but does not require them.

## Technical notes

- `src/features/project/settings/lifecycle.ts`: add `start_date` and `development_start_date` to `REQUIRED_FIELDS` for every status; add a new `VISIBLE_FIELDS: Record<LifecycleStatus, (keyof LifecycleDates)[]>` map exporting the per-status field list above. `missingRequiredField` needs no change.
- `src/features/project/settings/ProjectTimelineTab.tsx`: replace the fixed `DATE_FIELDS` / `REASON_FIELDS` render lists with the `VISIBLE_FIELDS[status]` list, splitting date inputs (grid) from reason textareas (stacked) by field name. Keep the existing Label/Input/Textarea/Select/DialogFooter patterns unchanged.
- No migration, no schema change — hidden values are still sent on save from the existing `dates` state.
- Update `docs/pages/project-settings-dialog.md` to describe the always-required start dates and status-scoped fields.
