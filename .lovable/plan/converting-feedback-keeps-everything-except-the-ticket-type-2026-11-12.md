# Converting Feedback keeps everything except the ticket type

## Goal
Converting a Feedback ticket only changes its type (and gives it the project's next ticket number). Status, original and current estimates, assignees, time logs, discussion, attachments, acceptance criteria, version and parent/child links all stay as they are. The ticket simply moves from the Feedback tab to Tickets, and developers can then log time on it. If it is made a child of another ticket, its epic can be taken from that parent.

## What goes wrong today
- The convert window starts the status at **Backlog**, so the ticket's current status is reset.
- Saving writes the **current** estimate into the **original** estimate too.
- Assignees are deleted and re-added on every conversion.
- Parent links are dropped unless the new type is Bug.

Time logs, comments and attachments already survive (same ticket).

## Changes
1. **Convert window becomes a confirmation**: choose type, with epic and parent prefilled. Estimates, status and assignees are no longer edited or re-saved there.
2. **Nothing is overwritten**: original and current estimates, status and assignees stay exactly as they were.
3. **Live development unlocks**: once converted, the ticket shows status, assignment and time logging like any ticket, so developers can log time against its existing estimate (or request more time).
4. **Parent kept for every type**: Bug still requires a parent; other types keep any existing parent.
5. **Epic from parent**: when a parent is chosen or already set and has an epic, the epic is filled from it with a "From parent" note; the PMBA can still change it. Otherwise the ticket's own epic is kept (still required).
6. Window text: "Everything on this ticket is kept — only the type changes."

## Technical details
- `ConvertFeedbackDialog.tsx`: simplified form (type, epic, parent); no estimate/status/assignee writes; no assignee delete/insert.
- `convertFeedback.ts`: `buildConvertPatch` returns only epic changes; never touches `original_*` / `current_*` estimates or `status_id`.
- Migration: re-create `convert_feedback_ticket` to set `ticket_type` and `parent_ticket_id` (any type; Bug requires one) and, if requested, `epic_id` from the parent. Renumbering in `before_ticket_insert` is unchanged.
- Confirm details panel / Log Time switch to normal behaviour (they key off `ticket_type`).
- Tests in `convertFeedback.test.ts`: status kept; original and current estimates unchanged; parent kept for Standard; epic adopted from parent.
