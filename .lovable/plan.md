## Goal

In the ticket side sheet, add tabs so users can switch between the existing **Ticket Detail** view and a new **Ticket Discussion** tab containing **Acceptance Criteria**. PMBA can edit (markdown), everyone can read. AC can also be populated via CSV import.

## Database

Add one column to `tickets`:

- `acceptance_criteria text` — nullable, default `null`. Stores raw markdown.

Migration only (no RLS change needed — existing `tickets` policies already cover it). The Supabase types will regenerate automatically.

## CSV import

Extend the importer in `src/features/tickets/ProjectTickets.tsx`:

- Detect a new column: `Acceptance Criteria` (also `acceptance_criteria`, `AC`).
- Add `acceptance_criteria` to the `ParsedRow` type and the insert payload.
- Add the column to the downloaded CSV template (`downloadTemplate`).
- For multi-line AC inside a CSV cell, Papa Parse already handles quoted newlines — no extra work.

## Ticket sheet — tabs

Refactor `src/features/tickets/TicketDetailSheet.tsx`:

1. Wrap the existing body content in a `<Tabs>` from `@/components/ui/tabs` with two triggers: **Detail** (current content) and **Discussion**. The header (formatted_id chips + title) stays above the tabs.
2. **Detail tab** = everything currently rendered (status, estimates, assignees, time logs, delete). No behavior change.
3. **Discussion tab** = new `AcceptanceCriteria` section:
   - **View mode** (default, all roles): renders `ticket.acceptance_criteria` as markdown. Empty state: "No acceptance criteria yet." with an Edit button if PMBA.
   - **Edit mode** (PMBA only): a `<Textarea>` (min-h ~280px) with markdown content + Save / Cancel. On save, `update tickets set acceptance_criteria = ... where id = ...`, then `onChange()`.
   - Toolbar above the textarea shows a small "Preview" toggle so PMBA can flip between editing and previewing before saving.

### Markdown rendering

Add `react-markdown` + `remark-gfm` (small, well-maintained, no heavy WYSIWYG deps). Render inside a `prose prose-invert prose-sm` Tailwind container so headings, lists, checkboxes, links match the dark theme. (Tailwind typography plugin is not currently in the project — we'll style minimally with custom classes on the wrapper to avoid adding `@tailwindcss/typography`. Specifically: paragraph spacing, list bullets, `<code>` background, link color using `text-primary`.)

### Read TicketRow

Add `acceptance_criteria: string | null` to the `TicketRow` interface in `src/features/tickets/useProjectTickets.ts` (the `select("*")` already returns it; just surface the field in the mapped object).

## Files to change

- **DB migration**: add `acceptance_criteria text` to `tickets`.
- `src/features/tickets/useProjectTickets.ts` — surface `acceptance_criteria` on `TicketRow`.
- `src/features/tickets/TicketDetailSheet.tsx` — add `<Tabs>`, new `AcceptanceCriteria` subcomponent, save handler.
- `src/features/tickets/ProjectTickets.tsx` — CSV column detection, template, payload.
- `package.json` — add `react-markdown`, `remark-gfm`.

## Out of scope

- Comments/threaded discussion (deferred per your answer).
- WYSIWYG toolbar (using markdown textarea + preview).
- Versioning/audit log of AC edits.

Approve and I'll implement.