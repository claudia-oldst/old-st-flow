# Convert window uses the Create tickets row

## What changes
- The "Convert to ticket" window goes back to using the same ticket row as **Add tickets** (title, type, parent, epic, status, FE/BE estimates, version, assignees). The custom type/parent/epic layout is removed.
- The row opens **pre-filled with the Feedback ticket's current details**: title, current FE/BE estimates, status, version, epic, parent and assignees. Type starts as Standard.
- Picking a parent fills in its epic, exactly like when creating a ticket.
- On convert, anything left untouched stays exactly as it was. Only fields you actually change are updated. Time logs, discussion, original estimates and the timeline are never touched.
- The single row can't be deleted, and Enter doesn't add another row.

## Technical details
- `ConvertFeedbackDialog.tsx`: render `DraftRow` (no `lockType`) with a `Draft` built from the ticket; pass statuses and members as `AddTicketsDialog` does; `canDelete={false}`, no-op `onRemove`/`onEnterAtLast`.
- `convertFeedback.ts`: diff the draft against the ticket and send only changed fields; keep Bug-needs-parent and epic-required checks.
- `convert_feedback_ticket` RPC: add optional title/status/estimate/version/assignee params, applied only when provided (current estimates only; originals untouched).
- Update `convertFeedback.test.ts`: unchanged draft sends only type; changed estimate sends only that field.
