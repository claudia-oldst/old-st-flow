# Editable client report page (portal-styled, print to PDF)

Replace the Word download in the client preview with a dedicated report page that looks exactly like the client portal, can be edited in place, and prints cleanly to PDF.

## What changes

- The **Download** button next to Hide becomes **Report**, opening a new report page in a new tab for the current project and cutoff.
- The report page renders the same payload the preview uses, styled with the portal's own components and tokens (navy surfaces, coral/gold accents, Poppins headings, mono numerics) — so it reads as one continuous branded document rather than a Word export.
- Text areas (title strapline, intro summary, per-epic client notes, and a closing note) are editable directly on the page. Edits are local to the page for the purposes of the printed document; the portal's saved copy is not changed.
- A print button triggers the browser print dialog; print CSS produces an A4 document with page breaks between sections, a repeated footer, white-on-dark converted to a light print theme for ink-friendly output, and no toolbar/buttons in the output.

## Report contents

1. Header — project name, client, "As of" date, version scope.
2. Intro summary (editable).
3. At-a-glance tiles — tickets, progress, cost (when a rate is set), month-to-date.
4. Progress and Frontend/Backend discipline bars.
5. **Estimate trend over time** — the aggregate line chart, scoped to included epics, cutoff and discounts.
6. Sprint timeline (Gantt) for the configured versions.
7. Epic table with included client notes (editable per epic).
8. Effective discounts and visible change requests.
9. Totals and the live portal link.

## Technical notes

- New route `/projects/:id/report` (authenticated, same access as the editor), rendered outside the app shell so the page is print-clean.
- Data comes from the existing `useClientPortalEditor` payload plus `useTrendData` / `buildTrendSeries`, `usePortalGantt` and `useProjectTickets` for change requests — no new RPCs, tables or RLS changes.
- Charts reuse `TrendChart` and the shared Gantt row builder. Recharts is given fixed pixel heights on the report so it renders deterministically when printing.
- Editable regions use `contentEditable` blocks with a plain-text paste handler; state is kept in the page only.
- Print styling lives in a scoped stylesheet with `@page { size: A4; margin: 14mm }`, `break-inside: avoid` on cards, and a light palette override.
- `buildClientReport.ts`, `DownloadReportButton.tsx` and the `docx` dependency are removed.
