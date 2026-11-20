# One Slack summary for every bulk action in sprint planning

## What changes
Every way of assigning several tickets at once in sprint planning sends each developer one Slack message ("You've been assigned X tickets to work on in Sprint N") instead of one per ticket:

1. Dragging several selected cards into a developer's lane.
2. Confirming tickets in Carryover Review.
3. The "Carry over" bulk button. The tickets are grouped by developer, and each developer gets their own summary.

These already work this way: the "Assign to dev" bulk button. These stay unchanged: dragging a single card (one ticket, one message) and every assignment outside sprint planning.

There are no database changes. All three actions reuse the sprint-planning bulk assign step that was added earlier.

## Technical details
- `useWorkbenchDnd.ts`: replace the `addTicketToLane` loop with a single `sprint_bulk_assign` call when `ids.length > 1`.
- `CarryoverReviewPanel.tsx`: replace the loop with one `sprint_bulk_assign` call.
- `useWorkbenchBulkActions.ts` `carryOver`: group the selected tickets by the current lane owner, then make one `sprint_bulk_assign` call per developer into the next sprint.
- Carryover still only adds to the new sprint and never removes the prior sprint commitment.
