# Import Cousteau R2 project logs

The uploaded file contains 3,142 time entries totalling 3,441.8 hours, spanning 5 Aug 2025 to 5 Aug 2026, all tagged to project `191ba49a…` = **Project Cousteau R2 (COUT)**. That project is currently completely empty in the database (no epics, tickets, logs or members), so this is a clean retro-import with nothing to overwrite.

## What gets created

| Item | Count |
| --- | --- |
| Epics | 30 (86 tickets have no epic and stay unassigned) |
| Tickets | 412 (326 Standard, ~72 Proj, ~14 Bug) |
| Time logs | 3,142 (3,441.8h) |
| Project members | 15 |

Tickets are identified by Ticket Name + Epic — that pairing is unique in the file, so no ticket gets created twice.

## Rules applied

**Ticket type and discipline**
- `Project` rows become `Proj` tickets; their hours log as Project hours.
- `Standard` and `Bug` rows become Standard / Bug tickets; FE and BE rows on the same ticket both attach to that one ticket.
- Bug tickets are imported as standalone tickets (the file has no parent linkage).

**Estimates**
- Original FE / BE / Project estimates come straight from the file. Where a ticket's rows disagree (some rows leave a column blank), the highest non-blank value for that ticket is used.
- Current estimates are set to the actual logged total for that ticket per discipline — so current FE estimate = total FE hours logged, and the same for BE and Project.

**Status (derived from logs)**
- Per discipline: last log within the past month (from 5 Jul 2026) -> `in_progress`; older -> `done`.
- The project-level status then falls out of the existing FE/BE status derivation rules automatically.
- Proj tickets have no FE/BE status and land in the default status.

**Dates**
- Ticket creation date = "Ticket Created Date" from the file.
- Each log's timestamp = Log Date + Start Time.

**People**
- The 15 `@old.st` emails all match existing team members; logs attach to their existing IDs.
- Each is added as a project member on COUT using their existing team role.
- Anyone who logged FE / BE / Project time on a ticket is also set as an assignee in that slot, so per-discipline reporting and the workbench work.

## Technical notes

- Import runs as a set of data inserts (epics -> tickets -> assignees -> time logs), not a schema migration. No schema changes are needed.
- Existing triggers do the rest: `apply_time_log` recalculates actual FE/BE/Project hours per ticket, `derive_project_status` sets the project status from FE/BE statuses, `before_ticket_insert` assigns COUT-001 style IDs, and `enforce_proj_ticket_zero_fe_be` keeps Proj tickets clean.
- GitHub and Slack sync triggers fire on ticket/assignee writes; since COUT has no GitHub repo and no notification prefs configured, those calls no-op.
- After the import I'll verify: total hours = 3,441.8, ticket and epic counts, and that per-ticket actual hours match the file.

## Not included

- Sprints (the file has no sprint data).
- Ticket descriptions / acceptance criteria (not in the file).
- Project start date and rate — tell me if you want those set too.
