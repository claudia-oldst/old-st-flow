# Parent and child links for Feedback tickets

## What changes for you
- On a Feedback ticket's Details tab, the Related tickets card lets a PMBA:
  - **Set a parent** — any normal ticket (Standard, CR, Bug) or another Feedback ticket in the same project.
  - **Add children** — a new "Add child" picker to link existing normal or Feedback tickets under it, plus an unlink (x) per child.
- On normal tickets, the parent picker also lists Feedback tickets, and the "Add child" picker can attach Feedback tickets as children.
- Feedback tickets keep their FB-n label when linked (they are not renumbered like Bug sub-tickets). Bugs linked to a normal parent keep today's numbering.
- Existing rules stay: same project only, no linking a ticket to itself or into a loop.
- When a Feedback ticket is converted, its links are kept.

## Technical details
- Migration: replace `enforce_bug_parent()` so:
  - Bug with Standard/CR parent: unchanged (sub-number + formatted_id).
  - Feedback ticket as child, or Feedback ticket as parent: allowed for any type; no sub-number, formatted_id untouched.
  - Other non-Bug children with non-Feedback parents: still rejected (current behaviour).
  - Add cycle check (walk parent chain) and self-parent check.
  - `detach_bug_children_before_parent_delete` skips formatted_id reset for Feedback children.
  - No changes to existing rows.
- `ParentTicketSelect.tsx`: accept allowed types per current ticket (include Feedback; for Feedback child include Bug too); show FB label.
- `RelatedTickets.tsx`: `canHaveParent` true for Feedback; new `AddChildSelect` (reuses ParentTicketSelect combobox) shown to PMBA on Feedback tickets and on normal tickets for Feedback children; unlink action sets `parent_ticket_id = null`.
- Ticket lists/reports already exclude Feedback, so links don't affect billing/health.
- Test: small unit test for the allowed parent/child type rule helper.
