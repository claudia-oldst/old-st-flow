# Sprints page rework

Tabs become: [ Sprints | Roadmap | Gantt ]
- Sprints = the sprint blocks we have today (setup + capacity).
- Roadmap = one ticket table where each ticket is planned or committed per sprint, per discipline.
- Gantt = derived from the same data.

People live only on the ticket (ticket_assignees). Sprints record what is committed, not who.
History of who did the work comes from time logs.

## Sprints tab (was "Roadmap")
Sprint blocks list stays as it is (dates, team avatars, capacity bars, edit/delete, Append next sprint block), plus:
- Two thin bars per block, FE and BE, stacked: committed (green) + planned (gold) against capacity, coral when over.
- Expanding a block shows one row per developer: name, FE/BE, stacked bar,
  "11h committed · 22h planned / 60h", coral with "+Xh over" when over.
  Load = remaining hours on tickets the person is assigned to that are Committed/Planned in that sprint.
- Clicking a sprint's name makes it the working sprint and opens the Roadmap tab.
- Delete is blocked while the sprint has committed tickets; planned tickets go back to "not planned".
- Fix: capacity labels show "35hh" (formatHours already adds "h").
- Fix: Edit sprint popover blocks start/end dates that overlap another sprint in the project.

## Roadmap tab (was "Planning")

```text
+--------------------------------------------------------------------------------------+
| Working in: [S5 closed] [S6 active] [S7] [S8]                                        |
+--------------------------------------------------------------------------------------+
| v Sprint 6  16→29 Nov  active  working in  (AA)(SA)(KM)(LA)(JS)                      |
|   FE ####==------ 77h / 168h   BE ###=------ 40h / 120h        [Developers: All v]   |
|   Andrea Ang     FE  ####=====------  11h committed · 22h planned / 60h              |
|   Kirsten M. U.  FE  ######==-----    16h committed ·  8h planned / 48h              |
|   Loren A.       BE  ==-----------     0h committed · 10h planned / 60h              |
|   (click a person to filter the table to their tickets)                  (sticky)    |
+--------------------------------------------------------------------------------------+
| [Search] [AI] [Epic v] [Type v] [Status v] [FE status v] [BE status v] [Assignee v]  |
| [Sprint v]  Group by [Epic v]  [Sprint columns: S5, S6 v]  (Show Dev done) (Show Proj)|
+--------------------------------------------------------------------------------------+
|                                                   |   Sprint 5    |  Sprint 6 (work) |
| [] Ticket            Status  FE·BE status Assign. Hours    |  FE  |  BE   |  FE  |  BE  |
|                                                   |      |       |77/168|40/120|
| v Invoicing 8                                                                        |
| [] HER-INV-14 PDF..  In prog FE In prog   FE AA   FE 6h/8h |Comm. |Comm.  |  +   |  +   |
|                              BE For int.  BE LA   BE 2h/4h |      |       |      |      |
| [] HER-RPT-7  Dash.. To do   FE To do     FE —    FE 0h/8h |      |       |Unplan|  –   |
+--------------------------------------------------------------------------------------+
| footer per visible sprint/discipline: C 27 (8 unpl.) · P 42 · 69 / 168h              |
+--------------------------------------------------------------------------------------+
```

### Working sprint
- Pills above the table. Default: the sprint covering today, else the next upcoming one. Kept in the URL.
- The working sprint's columns are highlighted; its FE/BE sub-headers show its totals (sticky).
- The capacity panel under the pills is the same component as the expanded sprint block on the
  Sprints tab, for the working sprint. Collapsible. "Developers" picker chooses who is shown
  (default all). Clicking a developer toggles the Assignee filter for them.

### Table
- Same table as the Tickets page (look, grouping, sorting, checkboxes, bulk select).
- Columns: Ticket (ID + title), Status, FE·BE status (two stacked chips: To do / In progress /
  For integration / Done, "–" if no hours), Assignments (FE and BE avatars; click opens Assign
  dialog), Hours (FE actual/estimate and BE actual/estimate stacked, coral when actual > estimate),
  then FE | BE cells for each visible sprint.
- Sprint columns picker: default = working sprint + the one before. Working sprint always shown.
  "Show all" / "Reset to default".
- Group by: None / Epic / Type / Status / Assignee, default Epic. Group headers collapsible, with
  count and a checkbox that selects the whole group. Collapse all / Expand all.
- Hidden by default: Dev done tickets and Proj tickets (toggles "Show Dev done", "Show Proj";
  choosing them in the Status/Type filter also shows them). Feedback tickets always excluded.
- Filters: Epic, Type, Status, FE status, BE status, Assignee (incl. Unassigned), Sprint
  (Unfinished from S{working-1}, Not planned, Planned S{n}, Committed S{n}, Unplanned S{n}).
  "Unfinished from S{n-1}" = committed in the previous sprint for a discipline whose own
  status (fe_status/be_status) is not done, and not in the working sprint for that discipline.
- Marker "!" on a row when only one discipline is in the working sprint and the other has hours.
- Only visible rows are rendered (virtualised); ~1,600 tickets on Herriot.

### Sprint cells (per ticket, per sprint, per discipline)
- Exactly three states: None (blank), Planned, Committed. No person is chosen in the cell.
- Display variant: Committed shows as "Unplanned" (coral) when the row's unplanned flag is set.
- Click an empty cell → Planned.
- Click a Planned/Committed cell → small menu: None / Planned / Committed (current one marked).
- "–" (not clickable) when the ticket has no hours for that discipline.
- Rules:
  - Planned is one sprint per discipline (writes planned_sprint_fe_id/be_id), so planning into
    S7 moves it from S6. Toast says what moved.
  - Committing in an open sprint removes that discipline's commitment from other open sprints
    and sets the planned sprint to the same sprint.
  - Committing sets unplanned = true if the ticket was not Planned for that sprint at that moment.
  - Closed sprints can be edited, but the first change to a closed sprint in a session asks:
    "Sprint 5 is closed. Changing it rewrites what was committed in Sprint 5. Edit Sprint 5 / Cancel."
    Editing a closed sprint never changes other sprints or the planned sprint.
- Every change: optimistic update of the row, sub-header totals, footer, capacity panel and
  Sprints tab bars; toast with Undo.

### Bulk bar (when rows are ticked)
- [FE + BE | FE | BE]  Set to [None] [Planned] [Committed] in Sprint {working}  ·  [Assign people]
- Same rules and Undo as single cells. Closed sprint → same one-time confirm.

### Totals
- Capacity uses remaining hours (current estimate − actual, min 0). Closed sprints use the
  committed estimate.
- Footer per visible sprint and discipline: committed (and unplanned share) · planned · total / capacity.

### Assign people dialog
- Unchanged slots (FE, BE, Project contributors). Each person chip shows their load for the working
  sprint, e.g. "Andrea Ang 33 / 60h", and previews the change before saving ("33 → 45 / 60h"),
  coral if over.
- Remove the sprint picker added in the 9 Sep plan; assigning never touches sprints.
- Bulk assign stays diff-based as today.

### Permissions
- PMBAs can change; others see everything read-only. Inactive members not selectable.

## Gantt tab
- Epics × sprints, FE / BE / All. Committed solid, planned outlined, today marker.
- A ticket appears in the sprint of its latest commitment for that discipline (not the first found),
  else its planned sprint. Same rule in get_client_portal_gantt.

## Remove
- Dev lanes / drag-and-drop columns, CarryoverReviewPanel, per-dev carryover hook,
  "Carry over" bulk button, sprint picker in Assign dialog.

## Technical details
- Database (one migration):
  - sprint_tickets: collapse to one row per (sprint_id, ticket_id, discipline), keeping the earliest
    created_at; set assigned_user_id to null (keep the column nullable for now); add unique
    (sprint_id, ticket_id, discipline).
  - sprint_tickets: add unplanned boolean not null default false.
  - Check nothing (FKs, triggers, RLS, cleanupAssignee, sprint_bulk_assign) assumes a user on the row.
- New under src/features/sprints/roadmap/: WorkingSprintBar, SprintCapacityPanel (shared with the
  Sprints tab block body), RoadmapTable, SprintCell, StatusMenu, SprintColumnsPicker,
  RoadmapBulkBar, useRoadmapMutations, useSprintTotals.
- Update: buildGanttRows (latest commitment), get_client_portal_gantt, ThinCapBar ("hh"),
  EditSprintPopover (overlap check), AssignDialog (load on chips, no sprint picker),
  docs/pages/sprints-*.md to match exactly what ships.
- State in the URL: working sprint, sprint columns, group by.
- Optimistic cache patches, no full refetch on each change.
- Files under ~250 lines. Tests: cell state transitions, planned move rule, open-sprint commit rule,
  unplanned flag, closed-sprint confirm, remaining-hours totals, Unfinished filter.
## Points to confirm before building
- **Database change (needs your OK):** one migration on sprint commitments: merge duplicate rows into one per sprint/ticket/discipline (keeps the earliest), clear the stored person on each commitment, add an "unplanned" flag and a uniqueness rule. This rewrites existing sprint records. Nothing else is deleted, and who-did-what stays in time logs and ticket assignments.
- **Slack:** dev lanes are removed and cells never pick a person, so the sprint-planning "assigned X tickets" summary no longer fires from the Sprints page. Assigning people (including bulk assign) keeps its normal notifications. The `sprint_bulk_assign` function would be retired.
- **Carryover:** replaced by the "Unfinished from S{n-1}" filter plus bulk "Set to Committed". No Slack is sent, which matches the current rule.
- The earlier move and carryover memory rules are replaced by these cell rules and will be updated after you approve.
- **No notifications during the change:** the migration only touches sprint commitment records, never ticket assignments, estimates or comments, so the Slack triggers aren't hit. As an extra guard it runs with notifications switched off for its duration, and no Slack function is redeployed mid-change. After the change, nothing is sent retroactively.
- **Recommended adjustments:** keep the stored person on old commitments (stop using it rather than clearing it) so closed sprints keep their history. Click-and-drag down a column is dropped; use checkboxes plus the bulk bar instead.
