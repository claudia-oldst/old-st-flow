## What's wrong

Draper has 28 baseline tickets: 13 backlog, 4 active, **11 in "DEV DONE (FOR DEPL.)"**, 0 done (confirmed by querying the project's tickets and the `statuses` table).

Both portal database functions (`get_project_portal_preview` and `get_client_portal`) bucket tickets into only three categories — `backlog`, `active`, `done`. Neither function references the `dev done` category at all (verified in their source). So Draper's 11 dev-done tickets are counted in the totals but land in no bucket: progress shows 0%, and epic rows show "0 done" with an empty bar.

The same three-bucket assumption exists in the portal UI. The project health Epic Risk table already handles all four categories correctly.

Secondary gap: the per-discipline strip counts only `todo` / `in_progress` / `done`, so tickets sitting in the `for_integration` discipline state disappear from those rows.

## Changes

### 1. Database (one migration, both portal functions)

Add a fourth bucket everywhere tickets are grouped:

- Totals: add `tickets_dev_done` alongside `tickets_backlog` / `tickets_in_progress` / `tickets_done`.
- Per-epic rows: add `dev_done_tickets` alongside the existing three counts.
- Discipline counts: fold `for_integration` into the in-progress count so no ticket is dropped.

No schema changes — only function bodies.

### 2. Portal types

Extend `PortalTotals` with `tickets_dev_done` and `PortalEpic` with `dev_done_tickets`.

### 3. Portal UI

- `PortalView`: progress tile percentage becomes `(done + dev_done) / total`; the tickets tile caption reads `X done · Y dev done · Z in progress · W to do`, omitting zero segments.
- Progress bars (`PortalView` tile, `PortalEpicRow`, discipline rows): three segments — done, dev done, in progress — using a distinct token for dev done.
- `PortalEpicRow` caption gains the dev-done count and its bar counts dev done toward progress.

### 4. Consistent labels

Grouped status reporting in the portal uses exactly **Backlog, Active, Dev Done, Done**, matching the status categories in Admin.

## Technical notes

- Colour for the dev-done segment comes from an existing semantic token (e.g. `bg-chart-in-progress` variant / `bg-health-watch`) — no hardcoded colours.
- The Sprint Gantt groups by per-discipline status (`todo/in_progress/for_integration/done`), not project status categories, so it is left alone unless you want it switched too.
