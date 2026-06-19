# My Work screen

**Route:** `/my-work`

A flat list of every open ticket assigned to the current user, across all projects. Designed to be the developer's daily home screen.

## Header
- Eyebrow: current user's display name.
- Title: "My Work" with a checklist icon.
- Subtitle: "Open tickets assigned to you across all projects."

## Rows
Each row represents one assignment (a single ticket can appear up to three times — FE, BE, Project — if the user is on multiple slots). Left to right:
- **Ticket ID** in mono (e.g. `ACME-042`).
- **Title** with the bug/CR prefix when applicable.
- Sub-line: project name · workflow status dot + name.
- **Slot indicator** — discipline status chip (FE/BE) or a fuchsia "Project" badge for project-slot assignments.
- **Hours readout** — `actual / estimate` for FE/BE; "—" for the Project slot.
- Arrow icon revealed on hover.

Rows are sorted by project, then ticket. "Done" tickets are filtered out — once the workflow status moves to a "done" category, the row disappears.

## Interactions
- Clicking a row opens the **Ticket Detail Sheet** for that ticket. Editing or status changes inside the sheet refresh the row in place (and remove it if it transitions to done).
- The list updates in real time when assignments change, when the ticket changes, or when time is logged against it — no manual refresh needed.

## States
- **Loading:** five skeleton rows.
- **Empty:** centered card "Nothing on your plate — No tickets currently assigned to you."
