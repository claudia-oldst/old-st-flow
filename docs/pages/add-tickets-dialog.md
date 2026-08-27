# Add Tickets dialog

PMBA-only. Opened from the **+ Add tickets** button on the Tickets tab.

## Layout
- Title: "Add tickets".
- A multi-line table editor — each row is a draft ticket.
- Columns: Title, Type (Standard / Bug / CR), Epic (select), FE estimate, BE estimate, Project estimate, Assignees (slot pickers).
- **+ Add row** button appends a blank line. Rows can be removed with a trash icon.
- Paste support — pasting multi-line text from a spreadsheet fills multiple rows at once.

## Copy tickets
- The split **Add ticket** button's dropdown includes **Copy tickets…**, which opens a separate paste dialog.
- Paste one ticket per line (a column copied from Excel/Sheets; only the first tab-separated cell is used). A live counter shows how many tickets are detected; duplicates are kept and noted.
- **Continue** closes the paste dialog and opens the row editor above with one pre-titled draft row per line; everything else uses defaults and rows are completed as normal.

## Interactions
- Inline validation: title required, estimates non-negative numbers.
- Epic select includes a "Create new epic…" option (inline create).
- Footer: **Cancel** + **Create N tickets** primary. The count updates as rows are added/removed.
- On submit: all rows are created in one batch; toast "Created N tickets"; dialog closes; list refreshes and scrolls to the new tickets.
- Partial failures show a per-row error and keep the dialog open with the failed rows preserved.
