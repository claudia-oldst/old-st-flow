# Screen documentation

One markdown file per screen the user sees, focused on **features, UI elements, and interactions** (not data plumbing). Where a single route hosts several distinct screens (tabbed pages, modal flows, archived-project state), each gets its own file.

## Index

### Auth & shell
- [login.md](./login.md) — Google sign-in screen
- [not-found.md](./not-found.md) — 404 screen
- [top-bar.md](./top-bar.md) — Persistent global header
- [weekly-hours-bar.md](./weekly-hours-bar.md) — Running weekly capacity strip
- [github-username-prompt.md](./github-username-prompt.md) — First-run GitHub link prompt

### Workspace
- [projects.md](./projects.md) — Projects list (home)
- [my-work.md](./my-work.md) — Cross-project assignments

### Project workspace (tabs under `/projects/:id/*`)
- [project-workspace-shell.md](./project-workspace-shell.md) — Project header, tab bar, access gate
- [project-tickets.md](./project-tickets.md) — Tickets board / list
- [ticket-detail-sheet.md](./ticket-detail-sheet.md) — Side sheet for a single ticket
- [bulk-assign-dialog.md](./bulk-assign-dialog.md) — Multi-ticket assignment editor
- [add-tickets-dialog.md](./add-tickets-dialog.md) — Bulk-create tickets
- [change-requests.md](./change-requests.md) — Client-facing change request review
- [estimate-revisions.md](./estimate-revisions.md) — Internal estimate-change review (PMBA)
- [sprints-roadmap.md](./sprints-roadmap.md) — Sprint Gantt roadmap
- [sprints-planning.md](./sprints-planning.md) — Planning pool + per-dev allocation
- [sprints-workbench.md](./sprints-workbench.md) — Active-sprint execution view
- [project-health.md](./project-health.md) — Overview, profitability, burn
- [estimate-evolution.md](./estimate-evolution.md) — Time-travel estimate history
- [client-portal-editor.md](./client-portal-editor.md) — PMBA portal authoring + preview
- [project-settings-dialog.md](./project-settings-dialog.md) — Project details, team, links
- [export-project-dialog.md](./export-project-dialog.md) — Export project data
- [vault-dashboard.md](./vault-dashboard.md) — Archived-project read-only shell

### Admin (`/admin`)
- [admin-team.md](./admin-team.md) — Team members tab
- [admin-statuses.md](./admin-statuses.md) — Statuses tab
- [admin-status-rules.md](./admin-status-rules.md) — Status rules tab (PMBA)

### Public client portal (`/h/:hash`)
- [portal-public-shell.md](./portal-public-shell.md) — Portal header + tab bar
- [portal-timeline.md](./portal-timeline.md) — Client Gantt
- [portal-summary.md](./portal-summary.md) — Epic scope + pricing
- [portal-change-requests.md](./portal-change-requests.md) — Client CR approval

### Time tracking
- [log-time-modal.md](./log-time-modal.md) — Log time against a ticket
- [start-group-timer.md](./start-group-timer.md) — Start a timer across many tickets
- [stop-group-timer.md](./stop-group-timer.md) — Stop and distribute group time
- [logoff-summary.md](./logoff-summary.md) — End-of-day summary dialog
