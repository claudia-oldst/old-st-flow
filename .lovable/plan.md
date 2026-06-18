## Goal

Make the bulk-assign dialog feel like editing the current assignees rather than choosing "add vs replace". Each developer chip simply reflects whether they're assigned to the selected tickets — click to toggle on/off.

## UX changes

- Remove the "Add to existing" / "Replace all" mode toggle.
- On open, load existing assignees for the selected tickets and pre-select them per slot (FE, BE, Project).
- Each chip has three visual states:
  - **Assigned to all selected tickets** — full color highlight (selected look).
  - **Assigned to some** — highlighted with a small "partial" dot/badge (e.g. "2/3").
  - **Not assigned** — dim/muted (current unselected look).
- Click behavior on a chip:
  - Not assigned → mark as **assign to all** selected tickets.
  - Partial or fully assigned → mark as **unassign from all** selected tickets.
  - Clicking again flips back. Pending state visible until Save.
- Keep the FE / Backend / Project sections (slot still matters for status derivation and Proj-only rules).
- Footer button becomes a single **Save assignments** with a summary like "+2 added, −1 removed".
- Confirmation toast: "Updated assignees on N tickets".

## Save logic (diff-based)

For each slot (FE, BE, Project) and each selected ticket:

1. Compute the existing `(ticket_id, user_id, slot)` set.
2. Compute the desired set: every chip currently in "assigned" state contributes `(ticket, user, slot)` rows for every applicable ticket (FE/BE/Project for Standard/Bug/CR tickets; Project only for Proj tickets).
3. **Insert** desired − existing.
4. **Delete** existing − desired (delete by matching `ticket_id`, `user_id`, `slot`).
5. Recompute fe_status/be_status reset for any ticket that ends with no FE/BE assignees (existing behavior).

This is one round-trip of inserts and one of deletes per save — no full wipe like today's Replace mode.

## Files to change

- `src/features/tickets/bulk-assign/useBulkAssign.ts` — drop `mode`, load existing assignees on open, expose `feUserIds/beUserIds/otherUserIds/projectUserIds` pre-populated, expose per-user "partial" map for chip rendering, rewrite `handleSave` to diff and apply.
- `src/features/tickets/bulk-assign/BulkAssignSlot.tsx` — accept a `partial: Set<string>` prop and render the partial indicator; selected chips show as assigned-to-all.
- `src/features/tickets/BulkAssignDialog.tsx` — remove mode toggle, update description, update footer button + summary count.
- `src/features/tickets/bulk-assign/useBulkAssign.test.ts` — update tests for the new behavior (pre-load, toggle, diff save).

## Out of scope

- No schema changes.
- The single-ticket assign flow (inside the ticket sheet) is untouched.
- The Add/Replace concept is removed entirely; if you want to keep a "Clear all" escape hatch, say so and I'll add a small secondary action.
