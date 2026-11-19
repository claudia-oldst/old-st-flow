# Bulk convert Feedback tickets

## What changes
- **Feedback tab bulk bar**: when tickets are selected, a new **Convert** button appears (PMBAs only, like single convert).
- **Convert window**: the same convert window opens, listing one row per selected ticket (scrollable), each pre-filled from its ticket so you can set type, estimates, epic, assignees, etc. per row. You can remove a row to skip it.
- **Convert all**: button reads "Convert N tickets". Tickets convert one by one; a summary toast shows how many succeeded. Any that fail (e.g. a missing required field) stay in the window with their error so you can fix and retry; successful ones drop out.
- Single-ticket Convert (row button and ticket details) keeps working — it's just the same window with one row.
- As before, time logs, discussion and original estimates are kept on every converted ticket.

## Technical details
- `ConvertFeedbackDialog`: accept `tickets: TicketRow[]` (single callers pass `[ticket]`); hold `Draft[]` keyed by ticket id; render `DraftRow` per draft with `canDelete` when more than one; move per-ticket save logic into `convertOne(ticket, draft)` in `convertFeedback.ts` (keeps dialog under 250 LOC).
- Validate all drafts up front with `buildConvert`; flag invalid rows before saving.
- `BulkActionsBar`: optional `onConvert` prop shown when `feedback`; `ProjectFeedback` passes selected rows and clears selection + reloads after.
- `TicketDetailSheet` updated to pass `[ticket]`.
- No database changes; reuses `convert_feedback_ticket`.
- Test: `buildConvert` across multiple drafts reports invalid ones without blocking valid ones.
