# Copy Tickets — bulk add from a pasted list

Add a "Copy tickets…" option to the existing split Add Ticket button's dropdown (next to "Import from CSV…"). It opens a separate paste dialog; on Continue, the parsed titles open in the existing Add tickets row editor as pre-filled drafts. The single Add ticket modal stays exactly as-is (no tabs inside it).

## Flow

1. **Add ticket** main button: unchanged — opens the row editor as today.
2. Chevron dropdown gains a new item: **Copy tickets…** (clipboard icon), above/below "Import from CSV…".
3. New **Copy tickets** dialog opens with a large textarea: "Paste one ticket per line — copy a column from Excel/Sheets".
4. Live counter under the textarea shows "16 tickets detected". Parsing rules:
   - Split on newlines; ignore blank lines; trim whitespace.
   - If a line contains tabs (multi-column Excel copy), only the first cell is used as the title.
   - Titles are clamped to the 200-character limit.
   - Duplicate titles are kept (a subtle note shows the duplicate count).
5. **Continue** (disabled when 0 lines detected) closes the paste dialog and opens the existing Add tickets dialog with one draft row per title — titles pre-filled, everything else (type, epic, status, estimates, version, assignees) at defaults. Epic is still required per row, so Create stays disabled until each row has an epic.
6. From the row editor, everything works as today: edit/remove rows, "Add another ticket", **Create N tickets** batch-creates via the existing submit path.

## Technical

- `src/features/tickets/add-dialog/parsePastedTitles.ts` (new): pure parser (split lines → first tab cell → trim → drop empties → clamp length) with a small unit test.
- `src/features/tickets/CopyTicketsDialog.tsx` (new): simple dialog with textarea, live count, Cancel / Continue; calls `onParsed(titles)`.
- `src/features/tickets/AddTicketsDialog.tsx` + `useDraftRows.ts`: accept optional `initialTitles?: string[]`; when the dialog opens with initial titles, seed drafts via existing `newDraft(defaultStatusId, defaultType)` with titles set (instead of one empty row). No changes when `initialTitles` is absent.
- `src/features/tickets/project-tickets/ProjectTicketsToolbar.tsx`: add `onCopyTickets?: () => void` prop and a **Copy tickets…** DropdownMenuItem (ClipboardPaste icon) next to Import from CSV.
- `src/features/tickets/ProjectTickets.tsx`: state `copyOpen`; render `CopyTicketsDialog`; on Continue set `initialTitles` and open `addOpen`; clear `initialTitles` when the add dialog closes.
- No database, RLS, or insert-payload changes.
- Update `docs/pages/add-tickets-dialog.md` with the new Copy tickets entry point.
