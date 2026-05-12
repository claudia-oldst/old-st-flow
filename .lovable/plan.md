## Goal
Backfill **Project Cousteau** (`COU`) with assignees, time logs, and estimate change requests from the four uploaded CSVs.

## Step 1 — Create missing team members
Insert into `team_members` with default `Fullstack` role, generated email `<first>@old.st`:
- Joyce Albos, Keneth Paladin, Patricia Regarde, Trixie Amistad

## Step 2 — Build name → user_id map
| CSV name | team_members |
|---|---|
| Claudia Schwaeble | Claudia |
| Gino Cuevas | Gino |
| Ida Jimenez | Ida |
| Jethro Tanjay | Jethro |
| Joven Tan | Joven |
| Kevin Brygs Tiangco | Brygs |
| Lind Tan | Lind |
| Lorenz Noble | Lorenz |
| Merielle Locsin | Merielle |
| Regina Abdao | Reg |
| (4 new from step 1) | new rows |

## Step 3 — Discipline mapping
- `frontend` → **FE**
- `backend` → **BE**
- `designer`, `project manager`, `quality analyst` → **Project**
- `fullstack` → look up that user's `project_members.role` for COU; if Frontend → FE, if Backend → BE, else Project (fallback FE)

## Step 4 — Create stub tickets for orphan time-log rows
For every distinct title in `Time_Export` that does NOT start with `COU-###`:
- Insert a new `tickets` row in project COU
- `title` = the orphan string (truncated reasonably)
- `ticket_type` = `Standard` (Bug if title contains "error"/"fix"/"bug" — keep simple: all Standard)
- Default estimates 0; trigger auto-assigns `ticket_number` and `formatted_id`
- Build a map `orphan_title → new ticket id` for reuse across all its log rows

## Step 5 — Insert time logs
For each row in `Time_Export`:
- Resolve ticket via `COU-###` prefix or orphan map
- Resolve user via name map
- `discipline` per Step 3
- `hours` = `Duration (minutes)` / 60
- `note` = Activity text
- `source` = `manual`
- `logged_at` = parsed `Date Logged` (e.g. "May 12, 2026")

The existing `apply_time_log` trigger will recompute `actual_*_hours` on tickets automatically.

## Step 6 — Insert estimate change requests
For each row in `Request_Export`:
- Resolve ticket + user
- `discipline`: frontend→FE, backend→BE, quality analyst→Project
- `previous_hours` = current ticket estimate for that discipline (read live)
- `new_hours` = `previous_hours` + (Requested Time / 60)  *(treating Requested Time as the delta hours requested)*
- `reason` = Reason text
- `status` = lower-case (`pending` / `approved`)
- `decided_at` = parsed Decision Date if present
- `created_at` = parsed Date Created

(If you want Requested Time interpreted as the **new total** instead of a delta, say so before I run.)

## Step 7 — Derive assignees
Collect every distinct `(ticket_id, user_id, slot)` from steps 5 + 6. Insert into `ticket_assignees` ignoring conflicts. Slot = the discipline used (FE/BE/Project). Note: the `validate_ticket_assignee` trigger requires the user to be a `project_members` row for COU with a compatible role — I'll pre-insert any missing `project_members` (role inferred: FE-only→Frontend, BE-only→Backend, both→Fullstack, Project-only→PMBA fallback).

## Execution
A single Python script using the Supabase REST/SQL via psql (or a migration with bulk INSERTs). I'll run it in batches and report counts:
- members created, project_members added, stub tickets created, time_logs inserted, change requests inserted, assignees inserted.

## Things to confirm before I run
1. **Requested Time = delta hours added** (assumed) vs total replacement.
2. **Stub ticket type** — all `Standard` OK?
3. **Pending CRs** — should I also bump `current_*_estimate` on the ticket? (Default: only for `approved` rows; pending leaves estimates alone — matches existing `ticket_estimate_changes` semantics.)
