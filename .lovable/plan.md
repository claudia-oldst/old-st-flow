# Add tickets from a copied list ("Add from Copy")

Let PMBAs paste a column of ticket titles copied from Excel/Sheets and turn it into pre-filled draft rows in the existing Add tickets dialog.

## Flow

1. The Add tickets dialog gets a small mode switch at the top: **Manual** (current row editor, default) and **Add from Copy**.
2. In Add from Copy, a large textarea: "Paste one ticket per line (copy a column from Excel)".
3. As the user types/pastes, a live counter shows "16 tickets detected". Blank lines are ignored, surrounding whitespace and tabs are trimmed; if a pasted line contains tabs (multi-column copy), only the first cell is used as the title. Titles longer than the 200-character limit are flagged and trimmed to the limit.
4. **Continue** switches to the normal row editor with one draft row per detected line, titles pre-filled, everything else (type, epic, status, estimates, version, assignees) left at defaults for the user to complete.
5. From there the existing behaviour is unchanged: rows can be edited/removed, "Add another ticket" still works, and **Create N tickets** saves the batch. Epic remains required per row, so the create button stays disabled until each row has an epic.
6. **Back** from the row editor returns to the paste box with the pasted text intact.

## Notes

- If the paste yields 0 usable lines, Continue is disabled with a hint.
- Duplicate titles are kept as separate rows (no silent de-duplication) but a subtle note shows the duplicate count.
- Dialog reset on close keeps working: reopening starts in Manual mode with one empty row.

## Technical

- `src/features/tickets/AddTicketsDialog.tsx`: add local `mode` state ("manual" | "paste"), render a paste step component when in paste mode, and hide the row list/footer buttons behind that mode.
- New `src/features/tickets/add-dialog/PasteStep.tsx`: textarea + parsed count + Continue/Cancel.
- New `src/features/tickets/add-dialog/parsePastedTitles.ts`: pure function splitting on newlines, taking the first tab cell, trimming, dropping empties, clamping length. Unit-tested alongside the existing schema tests.
- `src/features/tickets/add-dialog/useDraftRows.ts`: add a `setDraftsFromTitles(titles: string[])` helper that builds drafts via the existing `newDraft(defaultStatusId, defaultType)` and sets the title.
- No database, RLS or insert-payload changes — creation still goes through the current `submit()`.
- Update `docs/pages/add-tickets-dialog.md` to describe the two modes.
