# Show Proj tickets in PMBA's "My discipline (All)" board view

## Problem
On the project Board, switching to **My discipline → All** today only emits cards for FE and BE slots (one card per assigned discipline, bucketed by `fe_status` / `be_status`). Proj tickets — which have a single shared `Project` slot and a manually-managed status — never show up, so PMBAs viewing "All" see an incomplete board.

## Goal
When a PMBA (or any role that's allowed to see "All") is on the discipline board with the **All** filter active, Proj tickets should appear as their own cards alongside the FE/BE cards.

## Behaviour

- **Mode:** Discipline + filter = "All".
- **Who sees Proj cards:** roles that aren't restricted to a single discipline — i.e. PMBA, Fullstack, QA, Design (anyone who isn't Frontend-only or Backend-only).
- **Card emission:** for each Proj ticket with at least one `Project`-slot assignee, emit one card with `slot = "Project"`.
- **Status bucket:** Proj tickets don't have an FE/BE discipline status. Map them into the discipline columns by collapsing their project status category:
  - `backlog` → **To do**
  - `active` → **In progress**
  - `done` → **Done**
- **My tickets mode:** also emit a Proj card if the current user is assigned to the `Project` slot on that ticket.
- **Drag & drop:** dragging a Proj card between discipline columns updates the ticket's `status_id` to the first status in the target category (and sets `project_status_override = true` so `derive_project_status` leaves it alone). FE/BE cards keep their existing per-discipline behaviour.
- **Card rendering:** Proj cards use the existing Proj presentation (P badge, single project bar, Team list) — no per-discipline split.

## Technical notes

Files to change:

- `src/features/board/ProjectBoard.tsx`
  - Extend `DisciplineCard` slot union to include `"Project"` and `status` to a unified type (or store a derived `DisciplineStatus`).
  - In the `disciplineCards` `useMemo`:
    - Add a `showProject = role !== "Frontend" && role !== "Backend"` gate.
    - For each Proj ticket with a `Project` assignee, push `{ ticket, slot: "Project", status: categoryToDisciplineStatus(projectStatusCategory) }` in both All and My-tickets branches (My-tickets gated on the current user being in the `Project` slot).
    - Resolve the project status category by joining the ticket's `status_id` against the already-loaded `statuses` list.
  - In `handleDragEnd` discipline branch: when `slot === "Project"`, look up the first status whose `category` matches the dropped column (`todo → backlog`, `in_progress → active`, `done → done`) and update `tickets.status_id` + `project_status_override = true`. Skip the existing `fe_status` / `be_status` update path.
  - Render Proj cards with the standard `TicketCard` (it already handles Proj layout) instead of the FE/BE discipline variant.

No DB or types changes required — `Project` is already a valid `assignee_slot` and `actual_project_hours` / `current_project_estimate` already exist.

## Out of scope
- Time-logging behaviour (LogTimeModal / StartGroupTimerDialog) — PMBA still defaults to Overhead on non-Proj tickets, and the existing Proj=Project logic stays as-is.
- Any change to assignment eligibility — Proj-slot assignment still accepts any project member.
