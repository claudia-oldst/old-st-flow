# The Old St Tracker — Build Plan

A premium, dark-mode Agency Resource Management tool replacing ClickUp + Clockify. Built around dual FE/BE estimates and role-aware time logging so devs barely think about tracking.

## v1 Scope Decisions (locked)

- **No auth.** Single shared workspace; "current user" picked from a header dropdown of seeded team members. Google OAuth added in a later pass.
- **Time logging:** Both a live start/stop timer (persistent floating chip, realtime) AND a manual hours entry modal.
- **Assignees:** Tickets support multiple assignees — typically one FE dev + one BE dev. **Only PMBAs assign devs.** A dev must be a project member to be assignable.
- **Kanban columns = ticket statuses.** Statuses are **global** (shared across all projects); the Kanban board on every project renders one column per status in the configured order.
- **CSV import:** Fixed columns only (Title, Type, FE Estimate, BE Estimate). Mapper UI deferred.

## Visual Identity

- Background `#0A0A0A`, surfaces with subtle glass blur, borders `border-white/10`.
- Inter / Geist typography, crisp white text, muted gray secondary.
- Lucide-React icons (thin stroke).
- Color-coded health: green (under estimate), yellow (80–100%), red (over).

## Pages & Navigation

```text
┌─ Top bar ──────────────────────────────────────────────┐
│  Old St Tracker   Projects ▾   [User: Maya ▾]   ⏱ 00:42 │
└────────────────────────────────────────────────────────┘
   /                → Projects list
   /projects/:id    → Project workspace
        tabs:  Board · Tickets · Team · Health
   /admin           → Team members + Statuses + global settings
   /my-work         → Current user's assigned tickets across projects
```

Floating timer chip lives in the top bar whenever a timer is running.

## Role Capabilities

| Action | PMBA | Frontend / Backend / Fullstack | QA |
|---|---|---|---|
| Create project, set acronym | ✓ | — | — |
| Add/remove project members + set role | ✓ | — | — |
| Manage global statuses (add / rename / reorder / delete) | ✓ (admin area) | — | — |
| Create / import tickets | ✓ | — | — |
| Assign devs to tickets | ✓ | — | — |
| Log time on assigned tickets | ✓ (overhead) | ✓ | ✓ (overhead) |
| Move ticket between statuses | ✓ | ✓ (own tickets) | ✓ (own tickets) |
| View project health dashboard | ✓ | view-only | view-only |

## Core Flows

### 1. Project setup (PMBA)
- Create project: name + 3–5 char acronym (validated unique, uppercase).
- Project automatically uses the **global status set**.
- Team tab: add team members + role (Frontend / Backend / Fullstack / QA / PMBA).

### 2. Global status management (PMBA, in `/admin`)
- Single global list of statuses used by every project.
- Each status has: name, position, optional color/accent, **category** (`backlog` / `active` / `done`):
  - `backlog`: triggers "Move to active?" prompt on first time-log.
  - `active`: normal in-progress states.
  - `done`: ticket excluded from "open work" counts and capacity views.
- Drag-to-reorder. Add / rename / recolor / change category.
- Delete a status: only allowed if **no ticket in any project** uses it; otherwise PMBA must reassign first (inline picker).
- Must always have at least one `backlog`, one `active`, one `done` status.
- Seeded defaults on first run: **To-Do (backlog) · In Progress (active) · In Review (active) · Done (done)**.
- Changes apply to every project's board immediately (realtime).

### 3. Kanban board
- Renders **one column per global status**, in the configured order. Reordering or renaming statuses updates every project's board live.
- Drag tickets between columns to change status.
- Card shows: formatted ID, title (with prefix), assignee avatars (FE + BE), **two stacked progress bars** (FE actual/estimate, BE actual/estimate) with health color.
- Filter chips: "My tickets" (default for devs), "All" (default for PMBAs), per-assignee filter.
- First time-log on a `backlog`-category ticket prompts: "Move to {first active status}?" — one click confirms.

### 4. Ticket creation (PMBA)
- **Manual quick-add:** inline row at the bottom of each Kanban column — title + type + FE est + BE est, Enter to create. New ticket inherits that column's status.
- **CSV import:** upload `.csv` with columns `Title, Type, FE Estimate, BE Estimate`. Imported tickets land in the lowest-position `backlog` status. Preview first 5 rows, confirm, bulk insert. Auto-numbered `{ACRONYM}-001`, `-002`…
- **Title prefixing:** `Bug` → `[BUG] Title`, `CR` → `[CR] Title`, else plain.

### 5. Ticket assignment (PMBA only)
- Open a ticket → "Assignees" section with two slots: **Frontend dev** and **Backend dev**.
- Picker only lists project members whose role matches the slot:
  - FE slot → `Frontend` or `Fullstack`.
  - BE slot → `Backend` or `Fullstack`.
- Assigning surfaces the ticket on each dev's `/my-work` view and on the board with their avatar.

### 6. Time logging
A dev can only "Log Time" on tickets they are assigned to (button disabled with tooltip otherwise). PMBAs can log overhead on any ticket.

Modal with two tabs:

**Live Timer tab** — big start button; closes to a top-bar chip; on stop, confirm hours + optional note.

**Manual Entry tab** — hours + optional note + date.

**Discipline routing:**
- `Frontend` → `actual_frontend_hours`
- `Backend` → `actual_backend_hours`
- `Fullstack` → `FE | BE` segmented toggle (defaults to the slot they're assigned to)
- `QA` / `PMBA` → project overhead bucket

Only one timer per user.

### 7. PMBA Health Dashboard (`/projects/:id` → Health tab)
- **Global Progress:** two big rings — Total FE Actual vs Estimate, Total BE Actual vs Estimate.
- **Profitability indicator:** green / yellow / red pill.
- **Member capacity:** project members with assigned ticket count + hours logged this week.
- **Overhead bucket:** QA/PMBA hours.
- **Unassigned backlog:** count + quick link.
- "Open work" metrics exclude tickets in `done`-category statuses.

## Data Model (Supabase)

- `team_members` (id, name, email, avatar_color)
- `projects` (id, name, acronym unique, created_at)
- `project_members` (project_id, user_id, role) — composite PK
- `statuses` (id, name unique, position int, color, category ['backlog'|'active'|'done'], created_at) — **global table**
- `tickets` (id, project_id, ticket_number serial, formatted_id, title, ticket_type, status_id → statuses, est_frontend_hours, est_backend_hours, actual_frontend_hours, actual_backend_hours, actual_overhead_hours, created_at)
- `ticket_assignees` (ticket_id, user_id, slot ['FE'|'BE']) — composite PK
- `time_logs` (id, ticket_id, user_id, discipline ['FE'|'BE'|'Overhead'], hours, note, logged_at, source ['timer'|'manual'])
- `active_timers` (user_id PK, ticket_id, started_at, discipline)

DB triggers / constraints:
- Seed `statuses` on first migration (To-Do/backlog, In Progress/active, In Review/active, Done/done).
- On `tickets` insert: auto-set `formatted_id`; default `status_id` = lowest-position `backlog` status.
- On `ticket_assignees` insert: validate user is in `project_members` for the ticket's project AND role compatible with slot.
- On `project_members` delete: cascade-remove from `ticket_assignees`.
- On `statuses` delete: reject if any ticket references it.
- On `time_logs` insert: increment matching `actual_*_hours`.

RLS: enabled, permissive in v1 (no auth). Tightened with OAuth pass.

## Technical Stack

- React + Vite + TypeScript + Tailwind.
- shadcn/ui styled dark/glass.
- Lucide-React icons.
- Lovable Cloud (Supabase) + Realtime for timers, ticket changes, and global status changes.
- Zustand for active timer + current-user selection.
- `@dnd-kit` for Kanban drag-and-drop AND status reordering.
- `papaparse` for CSV.

## Build Order

1. Design tokens: rewrite `index.css` + `tailwind.config.ts` for the Old St dark theme.
2. Cloud setup: tables (incl. global `statuses` seeded), triggers, realtime, seed demo team members.
3. Shell: top bar, current-user dropdown, routes, projects list, project tabs, `/admin`, `/my-work`.
4. **Global statuses admin UI:** CRUD + drag-reorder + category + delete-guard.
5. Project create + team management.
6. Tickets: data layer, manual quick-add, CSV import, formatted IDs, prefixing.
7. Assignment UI (PMBA-only) with role-filtered pickers.
8. Kanban: columns from global statuses, drag-drop tickets, dual progress bars, assignee avatars, filters, backlog→active prompt.
9. Time logging: modal, discipline routing, fullstack toggle, floating timer chip with realtime, assignment gating.
10. Health dashboard: rings, profitability, capacity, overhead, unassigned backlog.
11. Polish: empty states, loading skeletons, health color thresholds, responsive check.

## Out of Scope for v1

- Authentication (Google OAuth next).
- Per-project status overrides.
- CSV column mapper / assignee in CSV.
- Server-enforced role permissions (UI-gated only in v1).
- Reporting exports, invoicing, client-facing views.
- Sprint/iteration grouping, sub-tasks, comments.
- Per-status WIP limits.
