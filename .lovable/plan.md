# My Timelogs

A new top-nav section where a user sees every time log they have made, grouped by month/week/day, filterable by project, with the ability to add a new log against any project + ticket they can access.

Built entirely from components that already exist in the app (list rows, group headers, selects, calendar popover, duration input, pagination, edit dialog). No new shared UI components are introduced — only the page itself and its data hook.

## Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Projects   My Work   My Timelogs   Admin        ⏱ pill  Log Time  ⌄  │
└──────────────────────────────────────────────────────────────────────────────┘

  My Timelogs
  Everything you have logged.                                   [ + Log time ]

  ┌ toolbar ───────────────────────────────────────────────────────────────┐
  │ Group by [ Month ▾ ]   Project [ All projects ▾ ]   Range [ Last 90d ▾ ]│
  └────────────────────────────────────────────────────────────────────────┘

  Total 128.5h  ·  62 entries

  ▾ August 2026                                                       48.2h
    ┌──────────────────────────────────────────────────────────────────────┐
    │ ⬤ 26 Aug   DRA-041  Checkout refinements     FE   Note text…   2.5h ✎│
    │ ⬤ 26 Aug   PRI-012  API pagination           BE   —            1.0h ✎│
    │ ⬤ 25 Aug   DRA-041  Checkout refinements     FE   Bug fixes    0.5h ✎│
    └──────────────────────────────────────────────────────────────────────┘

  ▾ July 2026                                                          80.3h
    ┌──────────────────────────────────────────────────────────────────────┐
    │ …                                                                     │
    └──────────────────────────────────────────────────────────────────────┘

                                        ‹  1  2  3  ›
```

New-log dialog (reuses the existing Log Time modal once a ticket is chosen):

```text
┌ Log time ──────────────────────────────┐
│ Project   [ Project Draper        ▾ ]  │
│ Ticket    [ DRA-041 Checkout …    ▾ ]  │  ← searchable, only tickets you can log on
│ ───────────────────────────────────    │
│ (existing Log Time modal body:         │
│  discipline · date · hours/minutes ·   │
│  note · capacity warning)              │
│                      [Cancel] [Log]    │
└────────────────────────────────────────┘
```

## Behaviour

- **Nav**: "My Timelogs" added to the top bar between My Work and Admin, route `/my-timelogs`.
- **List**: the current user's `time_logs`, newest first, showing date, ticket ID + title, project acronym, discipline, note and hours. Clicking a row opens the existing edit dialog (edit hours/note or delete).
- **Group by**: Month (default), Week (Mon–Sun), Day. Collapsible group headers with entry count and hours subtotal, matching the ticket-list group header style.
- **Filter by project**: multi-select of the projects the user is a member of; "All projects" default. Selections persist per user via the existing persistent-state hook.
- **Date range**: reuses the existing date-range control so long histories stay fast; defaults to last 90 days.
- **New log**: the "+ Log time" button opens a project picker → ticket picker, then hands off to the existing Log Time modal, so discipline gating, estimate checks and capacity warnings all behave exactly as they do on a ticket.
- After logging or editing, the list, totals and the Weekly Hours bar refresh.

## Technical notes

- New files: `src/pages/MyTimelogs.tsx` plus `src/features/timelog/my-timelogs/useMyTimeLogs.ts` (query + grouping) and a small picker wrapper for project/ticket selection before delegating to `LogTimeModal`.
- Query: `time_logs` filtered by `user_id = current member`, joined to `tickets` (formatted_id, title, type, project_id) and `projects` (name, acronym), ordered by `logged_at desc`, bounded by the selected range and project filter.
- Grouping is done client-side into month/week/day buckets with hour subtotals; pagination applies to groups' underlying rows via the existing `ListPagination`.
- Reused components: `GroupBySelect` (extended in-place with month/week/day values only for this page's variant is avoided — a plain shadcn `Select` is used instead), `MultiSelectFilter`, `DateRangeControl`, `ListPagination`, `MemberAvatar`, `EditTimeLogDialog`, `LogTimeModal`, `Popover`/`Calendar`.
- Route registered in `App.tsx` inside the authenticated `Routes` block; no RLS or schema changes needed (existing `time_logs` policies already scope reads).
- Docs: add `docs/pages/my-timelogs.md` following the existing page-doc pattern.
