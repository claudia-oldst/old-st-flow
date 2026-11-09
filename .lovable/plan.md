# Cleaner Status tab in ticket details

Goal: the same features with less clutter, taking ideas from your prototype. It uses only the app's existing parts (dropdowns, buttons, pills, collapsible sections, tooltips, status colours). No data or rule changes.

## Wireframe

```text
 COU-070 (* FOR INTEGRATION) [Standard v] [Applications] [Sprint 18] [+ Parent]
 COU-70: As an Admin, I want to ...                                [edit]
                                   [========] 6.4h / 6.4h

 [ Acceptance ] [ Status & time ] [ Discussion ]

+-- Status --------------------------------------------------+
| FE   o----o----(o)---o    For integration                   |
| BE   o----o----(o)---o    For integration                   |
|------------------------------------------------------------|
| Overall  [ * FOR INTEGRATION  v ]  (pin Set manually | Auto) |
+------------------------------------------------------------+

+-- Time ---------------------------------- [Edit estimates] -+
| FE (L)(+)  [============]  3.4h / 3.4h   [Request more time] |
|                            Originally 3h (+24m)              |
| BE (G)(+)  [============]  3.0h / 3.0h   [Request more time] |
|                            Originally 2h (+1h)               |
|------------------------------------------------------------|
| > Estimate history (2)                                       |
+------------------------------------------------------------+

+------------------------------------------------------------+
| > Time logs (7)                     (L) Lind 3.4h (G) Gino 3h |
+------------------------------------------------------------+

 Epic / Version / Parent fields (unchanged, matching spacing)
```

Unassigned side: `BE  Unassigned  [Assign]` in place of the steps.

## What changes

1. **Status card**
   - One card instead of the "Status" heading plus two boxes.
   - FE and BE dev status are shown as a 4-step track (To do, In progress, For integration, Done) in the status colours, with the current step's name next to it. Clicking a step sets it; read-only users see the track without clicking.
   - An **Overall** row below holds the project status dropdown (PMBA) or pill (others). When it was set by hand, a small "Set manually" tag appears with **Reset to auto**; otherwise a quiet "Auto" note.

2. **Time card** (estimates and assignees together)
   - One row per side: avatar(s) and a "+" to assign, progress bar, logged / current estimate, "Originally …" with the change in gold.
   - **Edit estimates** at the top right. "Request more time" per row replaces the "Click an estimate to revise" hint, and opens the same revision request.
   - Estimate history is collapsed under a chevron.

3. **Time logs**
   - Collapsed by default, with each person's total as small pills in the header row. Expand to see and manage logs as today.

4. **Header and tabs**
   - The separate assignee row under the title is removed (assignees now sit in the Time card).
   - The Status tab is renamed **Status & time**. Tab order stays the same, and Feedback tickets still open on Discussion.

## Not changing
- Acceptance and Discussion tabs, Feedback-ticket triage view, convert flow.
- Who can change dev status, project status, estimates, assignees and time logs.

## Technical details
- Files: `StatusBlock.tsx`, `DisciplineRow.tsx` (stepper), `EstimatesPanel.tsx` + `EstimateChangesPanel.tsx` (Time card, `Collapsible`), `TimeLogsPanel.tsx` (collapsible wrapper + per-person totals), `AssigneeBlock.tsx` (compact avatar + add, used inside rows), `TicketDetailBody.tsx`/`TicketDetailSheet.tsx` (layout, tab label).
- Stepper colours from `--status-progress/--status-integration/--status-done` tokens; replace `bg-white/[0.02]` and `amber-300` with semantic tokens (`surface-2`, `brand-gold`).
- Reuses existing `Select`, `Button`, `Tooltip`, `Collapsible`, `DisciplineStatusChip`; no new libraries.
