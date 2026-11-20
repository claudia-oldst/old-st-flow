# One Slack summary for bulk assignments in sprint planning

## What changes
- **Dragging several selected cards into a developer's lane** now sends that developer one Slack summary ("You've been assigned X tickets to work on in Sprint N") instead of one message per ticket.
- **Carryover sends no Slack message.** This covers both the Carryover Review confirmation and the "Carry over" bulk button. Carrying over is a sprint move, not a new assignment, and it only adds tickets to the next sprint without removing them from the previous one.
- **Unchanged:** the "Assign to dev" bulk button (already sends one summary), dragging a single card (one message), and all assignments outside sprint planning.

There are no database changes.

## Technical details
- `useWorkbenchDnd.ts`: when `ids.length > 1`, replace the `addTicketToLane` loop with one `sprint_bulk_assign` call.
- Carryover (`CarryoverReviewPanel.tsx`, and `carryOver` in `useWorkbenchBulkActions.ts`): switch to `sprint_bulk_assign`, grouped by lane owner. The RPC mutes per-ticket messages, and it only sends a summary when it creates new assignee rows. In a carryover the developer is already assigned, so no message goes out.
- Edge case: if a developer's assignment was removed before the carryover, the RPC would still send a summary. To guarantee silence, carryover can insert the sprint rows directly and skip re-adding assignees.
