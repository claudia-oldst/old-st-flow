# Fix print styling on the client report

Reviewing the printed PDF, several elements were built for the dark portal and stay light-on-white when printed, so they disappear. All fixes are print-CSS and small presentational tweaks in the report files — no data or portal logic changes.

## Issues found in the printed PDF

1. **Logo invisible** — the Old St logo is a pale/white mark, so it vanishes on the white page.
2. **Chart tooltip printed** — a solid black tooltip box is frozen over the estimate trend chart.
3. **Sprint timeline labels invisible** — epic and ticket names in the Gantt print in light grey/white; the "todo" legend swatch is also near-white.
4. **Gantt clipped** — the timeline is cut off at the right edge (orange overflow marker visible), and the FE/BE/ALL toggle buttons print as interactive controls.
5. **Placeholder text printed** — "Write a short introduction for the client…" and "Add a closing note for the client…" print when left empty.
6. **Change request IDs and some captions** too faint against white.
7. **Large empty areas** — the timeline and closing sections each start a new page and leave most of the page blank.

## Changes

- **Logo**: print a dark version of the mark (CSS filter to force it dark) so it reads on white; keep the current pale logo on screen.
- **Trend chart**: suppress the Recharts tooltip and any hover cursor overlay in print.
- **Sprint timeline**: force dark text for epic rows, ticket labels and axis dates in print; give the "todo" swatch a visible outline; hide the FE/BE/ALL discipline toggle when printing (the printed scope is whatever was on screen).
- **Gantt width**: scale the timeline to fit the A4 content width in print instead of clipping, so the full date range is visible.
- **Empty editable blocks**: hide placeholder text in print, and drop the whole Overview / Next steps panel from the printed page when it was left empty.
- **Faint text**: darken change-request IDs, epic captions, legend labels and the footer for print.
- **Pagination**: only force a page break before the timeline when it does not already fit, and let the closing note and footer flow after the totals rather than starting a fresh page.

## Technical notes

Work stays in `src/features/client-portal/report/report.css` (print rules), with minor markup/class additions in `ClientReportDocument.tsx` and `EditableText.tsx` (a class marking empty editable blocks so print can hide them). No changes to portal data, RPCs, or saved content.
