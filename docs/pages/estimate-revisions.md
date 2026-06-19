# Estimate Revisions tab

**Tab:** `/projects/:id/change-requests` — PMBA only.

Internal audit view of every estimate change on the project. Used to review developer-proposed revisions before they reach the client.

## Layout
- Toolbar with multi-select filters: epic, discipline (FE/BE/Project), proposer, state (Pending / Approved / Rejected).
- Grouped list by epic. Each epic card shows the rolling delta and a row per ticket revision.
- Each revision row: ticket ID + title, discipline, original → proposed values, delta, proposer avatar + name, timestamp, reason text.

## Interactions
- Pending rows expose **Approve** and **Reject** buttons.
- Rejecting opens a dialog to capture a reason; rejection is sent back to the proposer.
- Approved revisions become the new "current" estimate on the ticket and are reflected in Health and the client portal preview.
- Clicking the ticket ID opens the Ticket Detail sheet.

## Notes
- This screen is the internal counterpart of the client-facing **Change Requests** tab — revisions can be reviewed here before being promoted into a CR.
