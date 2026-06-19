# Change Requests tab

**Tab:** `/projects/:id/change-requests-cr` — visible to all project members.

A read-and-decide view of every Change Request ticket on the project, grouped by epic.

## Layout
- Header: title + count of pending CRs.
- For each epic that has CRs: a card with the epic name, a "before/after" estimate delta strip, and a list of CR rows.
- Each CR row shows: ticket ID, title, requested FE/BE/Project deltas, the decider (if decided), the decision timestamp, and the current approval state (Pending / Approved / Rejected).

## Interactions
- Clicking a CR row opens the Ticket Detail sheet.
- PMBA users get inline **Approve** / **Reject** buttons on Pending CRs. Reject opens a small dialog to capture a reason.
- Approving/rejecting updates the epic's delta strip instantly.
- Non-PMBA members see the same view in read-only mode.

## Empty state
"No change requests yet" with a hint to convert tickets to type "CR" from the Ticket Detail sheet.
