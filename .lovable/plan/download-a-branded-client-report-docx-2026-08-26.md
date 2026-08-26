# Download a branded client report (.docx)

Add a **Download** button next to **Hide** in the PMBA client preview header. It generates a branded Word document that mirrors the current preview snapshot — same project, same as-of date, same version scope, same discounts — so it can be emailed to the client as a formal report.

## Button

- Sits beside the existing "Hide" control in the preview pane header, same small ghost style, download icon + "Download".
- Disabled while the preview payload is loading; shows a spinner while generating and a toast when the file is saved.
- Filename: `{Acronym}-client-report-{as-of date}.docx` (e.g. `PRI-client-report-2026-08-26.docx`).

## Wireframe

Preview pane header (in the editor):

```text
 CLIENT PREVIEW                       [ ⤓ Download ]  [ ⤡ Hide ]
 ───────────────────────────────────────────────────────────────
 | Timeline | Summary | Change Requests |
```

Generated document (A4 pages):

```text
+---------------------------------------------------+
| [logo]                                            |
|                                                   |
| PROJECT PRISM 2                                   |
| Acme Corporation                                  |
| Status report as of 26 August 2026                |
| Versions in scope: v1, v2                         |
| ================================================= |  <- gold rule
|                                                   |
| Introduction                                      |
| Lorem ipsum intro text authored by the PM…        |
|                                                   |
| At a glance                                       |
| +-------------+---------------+-----------------+ |
| | Tickets     | 84            | 40 done · 12    | |
| |             |               | dev done · …    | |
| | Progress    | 62%           |                 | |
| | Cost to date| £48,200       | of £71,500      | |
| | August 2026 | £6,400        | FE 22h · BE 14h | |
| | to date     |               | Proj 4h · −2h   | |
| +-------------+---------------+-----------------+ |
|                                                   |
| Delivery progress                                 |
| Frontend   18 done · 4 in progress · 6 to do      |
| Backend    14 done · 3 in progress · 9 to do      |
+---------------------------------------------------+

+---------------------------------------------------+
| Scope by epic                                     |
| +--------------+-----+--------+-------+---------+ |
| | Epic         | Tkt | Act    | Cur   | Orig    | |
| +--------------+-----+--------+-------+---------+ |
| | Onboarding   |  12 | 96h    | 120h  | 100h    | |
| |   "Summary paragraph for the client…"         | |
| | Billing      |   9 | 60h    |  72h  |  72h    | |
| |   "Summary paragraph…"                        | |
| +--------------+-----+--------+-------+---------+ |
|                                                   |
| Discounts                                         |
| Epic | Discipline | Hours | Reason | Applied      |
| Bill | BE         |  −4h  | Rework | 31 Jul 2026  |
|                                                   |
| Change requests                                   |
| Ref | Title | Hours | Status | Decided           |
| CR-3| Export| +8h   | Approved| 12 Aug 2026      |
|                                                   |
| ------------------------------------------------- |
| Totals   Actual 156h · Current 192h · Orig 172h   |
|          Discounts −4h                            |
|          Total cost £48,200 (£95/hour)            |
|                                                   |
| Timeline: view the live portal at old.st/h/…      |
+---------------------------------------------------+
| Generated 26 August 2026 · Project Prism 2   p. 2 |
+---------------------------------------------------+
```

## Report contents

Laid out for a client audience, using the old.st brand (navy headings, coral accent rules, gold divider, Poppins-style headings / Inter body substitutes available in Word, logo at the top).

1. **Cover header** — logo, project name, client name, "Status report as of {cutoff date}", version scope line when the portal is scoped to specific versions.
2. **Introduction** — the PMBA intro text.
3. **At a glance** — table of the four preview tiles: total tickets with the done / dev done / active / backlog split, overall progress %, cost to date vs estimate (only when a rate is configured), and the month-to-date card (FE / BE / Project actuals, discounted hours, billed hours, cost).
4. **Delivery progress** — Frontend and Backend rows with done / in progress / to do counts.
5. **Scope by epic** — table of included epics: epic, tickets, actual / current / original hours, sub-total cost when the rate is shown. Below each epic that has one, its PMBA-authored client summary paragraph (respecting the "Show to client" toggle — excluded epics are omitted entirely).
6. **Discounts** — table of discounts in scope at the cutoff: epic, discipline, hours credited, reason, date applied. Section omitted when there are none.
7. **Change requests** — pending and approved CRs the client sees: reference, title, hours, status, decision date. Omitted when empty.
8. **Totals** — hours (actual / current / original), discounts applied, total cost and rate per hour.
9. **Footer** — page numbers and "Generated {date} · {project name}".

The Gantt timeline is not rendered into the document (it is an interactive chart); instead the report notes the live portal link for the timeline view.

## Technical notes

- Add the `docx` package and generate the file client-side in the browser (`Packer.toBlob`), triggered from a new `src/features/client-portal/report/buildClientReport.ts` plus a small `DownloadReportButton.tsx`.
- Input is the existing `PortalPayload` already held by `useClientPortalEditor` (epics, totals, month, discounts, project) plus the CR payload from the existing portal CR hook — no new queries, RPCs, or database changes.
- Numbers are formatted with the existing `formatHours` / `formatGBP` helpers so the document matches the on-screen figures exactly.
- US Letter page size is not used; A4 with 1 inch margins, DXA column widths on every table, and the logo embedded from `src/assets/oldst-logo.png`.
- No change to the public portal, the editor logic, or any existing component.
