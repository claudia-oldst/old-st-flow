# Public client portal — Change Requests tab

Where the client reviews and approves change requests without signing in.

## Layout
- Grouped by epic. Each epic card shows a baseline vs. new total strip.
- Each CR row inside an epic: title, requested deltas (FE/BE/Project hours and cost), short description, status pill (Pending / Approved / Rejected).

## Interactions
- Pending CR rows show an **Approve** button. Clicking it calls the server with the portal hash + ticket ID; on success the row updates to "Approved" with the timestamp and a toast "Change request approved".
- Approved/Rejected rows are read-only.
- Clicking a row expands a detail block with the full description and acceptance criteria.

## Loading / empty
- "Loading…" placeholder while CRs are fetched.
- "No change requests" empty state when there's nothing to show.
