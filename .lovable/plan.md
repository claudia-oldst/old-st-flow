# Cleaner Status tab in ticket details

Goal: same features, less visual noise. Changes are styling and layout in the ticket detail Status tab only. No data or logic changes.

## Wireframe

```text
 Status | Acceptance | Discussion
+------------------------------------------------------------+
| Project status          ( * FOR INTEGRATION v )  [pin] Auto |
|------------------------------------------------------------|
| FE  (L) Lind     [To do|In progress|*For integration*|Done] |
| BE  (G) Gino     [To do|In progress|*For integration*|Done] |
+------------------------------------------------------------+

 Estimates & actuals                                  [Edit]
+------------------------------------------------------------+
| Frontend  3.4h / 3.4h   orig 3h (+25m)  [=============]     |
| Backend   3.0h / 3.0h   orig 2h (+58m)  [=============]     |
| > Estimate changes (2)                        (collapsed)   |
+------------------------------------------------------------+

 Epic            Version           Parent ticket
 ...
```

Unassigned side example:

```text
| BE  Unassigned                                     Assign  |
```

## What changes

1. **One status card instead of three boxes**
   - Remove the extra "STATUS" heading and the separate "Discipline" and "Project status" boxes.
   - A single card with three rows: **Project status**, **FE** and **BE**.

2. **Project status row (top)**
   - Label on the left, the status as a coloured pill on the right (PMBAs can click it to change it, same dropdown as today).
   - The "Manual override" / "Auto from FE/BE" note becomes a small icon next to the pill, with a tooltip. The **Auto** reset button stays next to it when overridden.

3. **FE / BE rows**
   - Each row: FE/BE label, assignee avatar + name, then the dev status.
   - The dev status picker becomes a compact segmented control in the status colours (To Do grey, In Progress yellow, For Integration purple, Done green), instead of the bright white highlight.
   - Unassigned side: a short "Unassigned · Assign" line instead of the long sentence.
   - Read-only users still see a status chip.

4. **Estimates & actuals**
   - FE and BE estimate cards become one compact row each: "Frontend 3.4h / 3.4h · originally 3h (+25m)", with a thin progress bar. The overrun colour stays, but lighter.
   - Edit stays where it is, and clicking an estimate still opens a revision.
   - "Estimate changes (2)" becomes collapsed by default behind a chevron, so history is one click away.
   - The "Click an estimate to revise" hint becomes a tooltip on the estimates.

5. **Spacing and headings**
   - Consistent section headings (small, dim), even spacing between sections, fewer borders.

## Not changing
- Header (ID, pills, title, assignees, time bar), Acceptance and Discussion tabs.
- Epic/Version/Parent fields and time logs, except for matching spacing.
- All permissions: who can change dev status, project status, estimates.

## Technical details
- Files: `StatusBlock.tsx`, `DisciplineRow.tsx`, `EstimatesPanel.tsx`, `EstimateChangesPanel.tsx`, small spacing tweaks in `TicketDetailBody.tsx`.
- Reuse existing `Select`, `Tooltip`, `Collapsible`, `DisciplineStatusChip`, and the `--status-progress/--status-integration/--status-done` tokens; replace `bg-white/[0.02]` and `amber-300` with semantic tokens.
- Assignee names passed into StatusBlock from existing ticket data already loaded in TicketDetailBody.
