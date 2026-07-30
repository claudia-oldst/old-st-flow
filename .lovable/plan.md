## Goal
In the assign-people surfaces, the "Project contributors" list should only offer members whose project role is not Frontend, Backend, or Fullstack (i.e. QA, PMBA, Design). Frontend and Backend lists stay as they are (Frontend + Fullstack / Backend + Fullstack).

Proj-type tickets keep showing every project member in their single "Team members" list (unchanged).

## Changes
- `src/features/tickets/AssignDialog.tsx` — add a separate `projectContributorEligible` list filtered to roles other than Frontend/Backend/Fullstack, and use it for the "Project contributors" picker only. The Proj-ticket "Team members" picker keeps using all members.
- `src/features/tickets/add-dialog/AssignPopover.tsx` — same split for the Add Tickets dialog popover.
- `src/features/tickets/bulk-assign/useBulkAssign.ts` — apply the same filter to the Project column's member picker, keeping FE/BE lists as-is.

## Notes
Already-assigned dev users in the Project slot on existing tickets remain assigned and visible as chips; they simply won't appear as new options in the contributor picker.
