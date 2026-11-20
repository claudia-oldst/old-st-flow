# Sprints page rework: Roadmap Matrix

The existing sprint pieces stay (sprint setup blocks, capacity bars, planning workbench). A new **Roadmap** view gives a ticket-by-sprint grid for rough planning. No database changes: it uses the existing planned sprint fields and sprint commitments.

## Wireframe

```text
+----------------------------------------------------------------------------------+
| Sprints                                  [ Roadmap | Planning ]   [ FE | BE ]    |
+----------------------------------------------------------------------------------+
| SPRINT BLOCKS (existing, collapsible)                                            |
| +------------------+ +------------------+ +------------------+ +----------------+ |
| | Sprint 19        | | Sprint 20 ACTIVE | | Sprint 21        | | Sprint 22      | |
| | 02 Nov - 13 Nov  | | 16 Nov - 27 Nov  | | 30 Nov - 11 Dec  | | 14 Dec - 25 Dec| |
| | FE ####==---  80h| | FE ######=-- 80h | | FE ##====--- 80h | | FE ===----- 80h| |
| | BE ###=----   60h| | BE #####==-  60h | | BE #==------ 60h | | BE ==------ 60h| |
| | [v] per dev      | | [v] per dev      | | [v] per dev      | | [v] per dev    | |
| +------------------+ +------------------+ +------------------+ +----------------+ |
|   # = committed (green)   = = planned (gold)   - = free capacity                 |
|   Expanding shows each dev's committed load; planned stays sprint-level only.    |
+----------------------------------------------------------------------------------+
| [Search...] [AI] [Type v] [Epic v] [Status v] [Group: Epic v]  [Unplanned only]  |
+----------------------------------------------------------------------------------+
| Ticket                         | Est FE | S19   | S20   | S21     | S22   |      |
|--------------------------------+--------+-------+-------+---------+-------+------|
| v Epic: Payments  (12)         |  48h   |  8h   | 16h   |  20h    |  4h   |      |
|   HER-101 Change payment det.  |   8h   | [###] |       |         |       |      |
|   HER-102 Card validation      |  16h   |       | [###] |         |       |      |
|   HER-110 Refund flow          |  20h   |       |       | [ = = ] |       |      |
|   HER-114 Receipts email       |   4h   |       |       |         | [===] |      |
| > Epic: Onboarding  (30)       | 120h   |       |  24h  |  40h    | 56h   |      |
+----------------------------------------------------------------------------------+
  Cell click cycles:  blank -> Planned (gold) -> Committed (green) -> blank
  Committed cells show the dev's initials; committing without a dev asks to pick one
  (or drops it into the sprint's unassigned pool in Planning).
```

## What you get

- **Roadmap tab (new)**: rows are tickets (grouped by Epic by default), columns are upcoming and active sprints. Click a cell to plan a ticket into a sprint, click again to commit it.
- **Planned = rough forecast** for the whole sprint, no person needed (gold).
- **Committed = real sprint commitment** (green), shown against each dev's capacity when a block is expanded.
- **FE | BE toggle** keeps the grid compact; each discipline is planned separately.
- Group headers show hours per sprint so overloaded sprints stand out.
- Same search (including AI search), filters and column behaviour as the Tickets table.
- **Planning tab**: the existing workbench (dev lanes, drag and drop, carryover) is unchanged, so moves keep assignments and bulk actions still send one Slack summary.

## Rules kept

- Moving between sprints keeps the dev; carryover adds without removing and sends no Slack.
- Feedback tickets are excluded; inactive members can't be chosen.
- Only PMBAs can commit or plan; everyone else sees read-only.

## Technical details

- New `src/features/sprints/roadmap/`: `RoadmapView`, `RoadmapGrid` (virtualised rows), `RoadmapCell`, `useRoadmapData` (built from the existing progressive ticket cache + `sprint_tickets`), `useRoadmapMutations` (optimistic cache patch).
- Planned: update `tickets.planned_sprint_fe_id` / `planned_sprint_be_id`. Committed: reuse `addTicketToLane` / `sprint_bulk_assign`; uncommit reuses existing removal path.
- `ThinCapBar` becomes stacked committed + planned against capacity.
- Reuse `_shared/review-list` toolbar, `MultiSelectFilter`, AI search hook. Files kept under ~250 lines.
- Tests for the cell cycle and planned/committed hour totals.
- Also folds in the pending fix so sprint edits patch tickets in place instead of reloading the whole list.
