# Feedback tab: tidier table + Tickets-style toolbar

## What changes
1. **Table columns** for Feedback: ID, Title, Epic, FE estimate, BE estimate, then a coral **Convert** button at the end of each row. Version, Status and Dev status are hidden (they don't apply while it's feedback).
   - Convert opens the existing Convert to ticket dialog (PMBA only; others see no button). Clicking the row still opens the ticket on Discussion.
2. **Toolbar above the table**, using the Tickets tab's existing toolbar: Group by, Filter, Search, and an **Add feedback** button.
   - Board/list toggle, "Mine" toggle, group timer, import and copy are hidden.
   - Group-by options limited to those that make sense: None, Epic, Version.
3. **Add feedback ticket** reuses the existing Add tickets dialog, locked to the Feedback type (type picker hidden); created tickets get FB-n labels and land only in this tab.

## Technical details
- `ProjectFeedback.tsx`: render `ProjectTicketsToolbar` with `showViewToggle/showMineToggle/showGroupTimer=false`, wire filters/search/groupBy into `useProjectTicketsPaged({ feedback: true })`.
- `TicketsList`: add optional `columns?: ColKey[]` override and a `rowAction` render prop for the trailing Convert cell (styled `variant="default"` = coral primary). Used only by Feedback; Tickets tab unchanged.
- `AddTicketsDialog`: add `lockType` prop; with `defaultType="Feedback"` the DraftRow hides the type select. Ensure insert path allows Feedback (existing `before_ticket_insert` already assigns FB-n). Hide status/assign controls in that mode.
- Convert button reuses `ConvertFeedbackDialog`.
- No database changes.
