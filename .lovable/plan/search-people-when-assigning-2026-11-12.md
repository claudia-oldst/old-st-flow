# Search people when assigning

## What changes
- The **Assign people** dialog (single ticket) and the **Bulk assign** dialog get one search box at the top: "Search people…".
- Typing narrows every section (Frontend, Backend, Project contributors / Team members) to people whose name, email or role matches. Matching ignores upper/lower case.
- People already ticked stay visible even if they don't match, so you never lose sight of who is assigned.
- A section with no matches shows "No matches".
- Search clears when the dialog is reopened. Typing then pressing Enter does nothing unexpected (no save).

## Technical details
- New `src/features/tickets/assign/memberSearch.ts`: `matchesMember(member, query)` + `filterMembers(list, query, selected)` (keeps selected).
- `AssignDialog.tsx` and `BulkAssignDialog.tsx`: add `query` state + `Input` with search icon; pass filtered lists to `SlotPicker` / `BulkAssignSlot` (empty-state text in both).
- `memberSearch.test.ts`: name/email/role match, case-insensitive, selected kept when not matching.
