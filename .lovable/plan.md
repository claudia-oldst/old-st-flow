# Sprints page rework

## Roadmap tab: no change
The sprint blocks list (dates, dev, capacity bar, edit/delete, Append next sprint block) stays exactly as it is, on its own tab.

## Planning tab: pick a sprint, see its capacity update live

```text
[ Roadmap | Planning | Gantt ]
+----------------------------------------------------------------------------------+
| Sprint: [S8] [S9] [S10 ACTIVE] [S11] [S12]  >                                    |
+----------------------------------------------------------------------------------+
| SPRINT 10 CAPACITY  Nov 7 - Nov 20                                    (sticky)   |
|  FE  ######====------   52h committed + 16h planned / 80h                         |
|  BE  ####==--------     30h committed +  8h planned / 60h                         |
|  v per dev:  Reg  ######---- 28h/40h     Dan  ####------ 24h/40h                  |
|        # committed (green)   = planned (gold)   - free   red when over           |
+----------------------------------------------------------------------------------+
| [Search...] [AI] [Type v] [Epic v] [Status v] [Group: Epic v] [Not in sprint]    |
+----------------------------------------------------------------------------------+
| :: v Authentication & Onboarding  14                                             |
| [] ID      Title                 Status   FE      FE status FE sprint  BE      BE status BE sprint  Assignees |
| [] PUL-003 Skip GitHub linking.. IN QA    2h/2h   Done      Committed  0h/3h   To do     Planned !  Dennis    |
| [] PUL-005 Assign initial roles  IN QA    0h/4h   In prog.  Committed  0h/6h   In prog.  Committed  Dennis    |
| [] PUL-400 [BUG] Session persi.. BACKLOG  0h/1h   To do     Planned    0h/0h   -         -          -         |
+----------------------------------------------------------------------------------+
 Same table, grouping, sorting, checkboxes and bulk actions as the Tickets page.
 ! = one side is in this sprint but the other isn't, so dependencies stand out.
 Click the sprint cell: Not in sprint -> Planned -> Committed (pick dev) -> Not in sprint
 Every change updates the capacity bars above instantly, no reload.
```

- Selecting a sprint tab loads that sprint's capacity into the top block.
- Planned is a rough sprint-level forecast (no person); committed is per dev and counts against their capacity.
- The list is the normal Tickets table (same look, groups and bulk select) with extra FE status / FE sprint and BE status / BE sprint columns. FE and BE are shown side by side, in the capacity block and on every ticket row, so dependent work can be planned together. A subtle marker flags tickets where only one discipline is in the sprint.
- Existing dev lanes, drag and drop and carryover remain available in the Planning tab below the list. Moving keeps the dev, carryover adds without removing and sends no Slack, and bulk assigning sends one summary.
- PMBAs only can change; others see read-only. Feedback tickets excluded, inactive members not selectable.

## Technical details
- Roadmap tab untouched. New `src/features/sprints/planning/` pieces: `SprintTabs`, `SprintCapacityHeader` (reuses `ThinCapBar`, stacked committed+planned), `SprintPlanList`, `useSprintPlanMutations`.
- Planned writes `tickets.planned_sprint_fe_id/be_id`; committed reuses `addTicketToLane` / `sprint_bulk_assign`. No database changes.
- Optimistic cache patches so the bars and rows update without refetching all tickets (folds in the pending reload fix).
- Selected sprint kept in the URL; files under ~250 lines; tests for the cell cycle and capacity totals.
