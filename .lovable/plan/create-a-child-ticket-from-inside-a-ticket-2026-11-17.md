# Create a child ticket from inside a ticket

## What you'll see
- In **Related tickets > Children**, a new **+ New child ticket** button sits next to the "Add child ticket…" picker.
- It is shown to PM/BAs and QA (QA = team role or project role "QA").
- Clicking it opens the same **Add tickets** window used everywhere else, with:
  - type preset to **Bug** (can still be changed),
  - parent already set to the current ticket,
  - epic copied from the parent so the bug lands in the same place.
- You can still queue several tickets with "Add another ticket"; each new row is also linked to the parent.
- After saving, the window closes and you're back on the parent ticket, same view. The new child appears straight away in the Children list — no refresh.
- The existing "bug logged against this ticket" comment on the parent still posts, as today.

## No database changes
Project members (incl. QA) can already create tickets and set a parent.

## Technical details
- `AddTicketsDialog`: new optional `defaultParent?: { id, title, epicId }` prop, passed to `useDraftRows` so `newDraft` fills `parentTicketId`, `parentTitle`, `epicId` for the first row and for "Add another".
- `RelatedTickets.tsx`: add the button + dialog (`defaultType="Bug"`), `onCreated` bumps the local `reload` counter and calls `onChange()` so the list and ticket refresh in place. Show it when `isPMBARole || isQA` and the ticket can be a parent (not Proj / Bug-under-rule). `isQA` derived from the current team member / project member role and passed from `TicketDetailBody`.
- Child-type visibility rule: allow the create button whenever `canLink("Bug", ticket.ticket_type)` (Standard and CR parents).
- Small test in `linkRules.test.ts` for which parent types allow creating a Bug child.
