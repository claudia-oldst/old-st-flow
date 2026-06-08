# Sprint Planning Workbench — Layout Revision

Only the Workbench layout changes. All previously-agreed database schema, RLS, DnD semantics, cross-sprint preservation rules, conditional `ticket_assignees` cleanup, realtime invalidation, and PMBA-only gating remain exactly as planned.

## Revised Workbench Layout

The Workbench is now a **three-zone horizontal layout** instead of two:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Target Sprint: [Sprint 14 ▾]            Capacity totals · OVERALLOCATED ⚠   │
├────────────────┬────────────────┬────────────────────────────────────────────┤
│  BACKLOG       │  SPRINT POOL   │  DEVELOPER LANES (horizontal scroll →)     │
│  (source pool) │  (unassigned   │                                            │
│                │   in sprint)   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────  │
│  Source: [▾]   │                │  │ Alice  │ │ Bob    │ │ Carol  │ │ Dan    │
│  Search…       │  FE Rem: 42h   │  │ FE     │ │ BE     │ │ FE     │ │ BE     │
│  Epic [▾]      │  BE Rem: 31h   │  │ 28/40h │ │ 36/40h │ │ 44/40h │ │ 18/32h │
│  Type [▾]      │                │  │ ▓▓▓▓░  │ │ ▓▓▓▓▓  │ │ ▓▓▓▓▓! │ │ ▓▓░░░  │
│  Hide done ☐   │  ┌──────────┐  │  ├────────┤ ├────────┤ ├────────┤ ├──────  │
│                │  │ TCK-201  │  │  │ TCK-12 │ │ TCK-45 │ │ TCK-77 │ │ TCK-9  │
│  ┌──────────┐  │  │ FE 8 BE3 │  │  │ FE 5h  │ │ BE 12h │ │ FE 13h │ │ BE 6h  │
│  │ TCK-301  │  │  └──────────┘  │  │ ...    │ │ ...    │ │ ...    │ │ ...    │
│  │ FE 5 BE2 │  │                │  │        │ │        │ │        │ │        │
│  └──────────┘  │  ┌──────────┐  │  └────────┘ └────────┘ └────────┘ └──────  │
│  ┌──────────┐  │  │ TCK-204  │  │                                            │
│  │ TCK-305  │  │  │ FE 0 BE5 │  │                                            │
│  └──────────┘  │  └──────────┘  │                                            │
│                │                │                                            │
└────────────────┴────────────────┴────────────────────────────────────────────┘
       3 cols           3 cols                     6 cols (scrolls)
```

### Column sizing
- Workbench grid changes from `grid-cols-12` (4 / 8 split) to `grid-cols-12` (**3 / 3 / 6 split**).
- Backlog column: `col-span-3`, vertical scroll, filters pinned top.
- Sprint Pool column: `col-span-3`, vertical scroll, header shows `FE Rem` + `BE Rem` totals for unassigned-in-sprint tickets.
- Developer Lanes container: `col-span-6`, horizontal scroll, each lane a fixed-width column (e.g. `w-72`).

### Drop targets — unchanged semantics, new spatial mapping
- **Backlog → Sprint Pool** (now an adjacent left-to-right drop): insert `sprint_tickets(target, ticketId, null)`. Cross-sprint backlog source preserves the original row.
- **Backlog → Developer Lane**: insert `sprint_tickets` + upsert `ticket_assignees` in dev's specialty slot.
- **Sprint Pool → Developer Lane**: update `sprint_tickets.assigned_user_id` + upsert `ticket_assignees`.
- **Developer Lane → Sprint Pool**: set `assigned_user_id = NULL` + conditional `ticket_assignees` cleanup (preserve row if `time_logs` exist for that `ticket_id + user_id + discipline`).
- **Developer Lane / Sprint Pool → Backlog**: removes from sprint (deletes current-sprint `sprint_tickets` row) with same conditional assignee cleanup.

### Files affected by this layout change only
- `src/features/sprints/SprintWorkbench.tsx` — grid template updated to three zones.
- `src/features/sprints/SprintPoolPanel.tsx` — promoted to a full sibling column (no longer nested beneath `BacklogPanel`).
- `src/features/sprints/BacklogPanel.tsx` — narrows to `col-span-3`; filters stack vertically inside this narrower column.

No other planned files, queries, mutations, or invalidation keys change.

### Out of scope (still)
Bulk sprint deletion UI, auto-suggested capacity, sprint membership on Tickets table, mobile/narrow layout (workbench remains desktop-first; below ~1280px the three columns will horizontally scroll as a group), velocity analytics.