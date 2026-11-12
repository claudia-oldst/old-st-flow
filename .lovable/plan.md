# Converting Feedback keeps everything except the ticket type

## Goal
Converting a Feedback ticket only changes its type (and gives it the project's next ticket number). Status, estimates, assignees, time logs, discussion, attachments, acceptance criteria, version and parent/child links all stay as they are. If the ticket has (or is given) a parent, its epic can be taken from that parent.

## What goes wrong today
- The convert window starts the status at **Backlog**, so the ticket's current status is reset.
- Saving writes the **current** estimate into the **original** estimate too, losing any approved revision history.
- Assignees are deleted and re-added on every conversion.
- Parent links are dropped unless the new type is Bug.

Time logs, comments and attachments already survive (same ticket), so no change is needed there.

## Changes
1. **Convert window** starts from the ticket's real values: current status, original and current estimates, assignees, version, parent. The window becomes a confirmation: type choice, plus epic and parent (prefilled).
2. **Only changed fields are saved.** Estimates and status are left untouched unless the PMBA edits them; assignees are only rewritten if changed.
3. **Parent kept for every type.** Bug still requires a parent; other types keep any existing parent.
4. **Epic from parent.** When a parent is chosen (or already set) and it has an epic, the epic is filled from the parent with a small "From parent" note; the PMBA can still change it. Without a parent, the ticket's own epic is kept (still required).
5. Wording in the window: "Everything on this ticket is kept — only the type changes."

## Technical details
- `ConvertFeedbackDialog.tsx`: `draftFrom` uses `t.status_id` instead of backlog; diff draft vs original ticket and only include changed keys; skip assignee delete/insert when unchanged.
- `convertFeedback.ts`: `buildConvertPatch(draft, ticket)` returns a minimal patch; never sets `original_*` from current; Proj conversion keeps existing project estimate if present.
- Migration: re-create `convert_feedback_ticket` so it only sets `ticket_type` and keeps `parent_ticket_id` (accepts `_parent_id` for any type; Bug still requires one). If `_parent_id` given and the ticket has no epic / PMBA chose adopt, set `epic_id` from parent. `before_ticket_insert` update branch already only renumbers — unchanged.
- Tests in `convertFeedback.test.ts`: status kept; originals untouched; parent kept for Standard; epic adopted from parent; unchanged assignees not rewritten.
