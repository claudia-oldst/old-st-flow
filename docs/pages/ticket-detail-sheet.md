# Ticket Detail sheet

A right-side slide-over showing everything about a single ticket. Opened by clicking a ticket card, a row in My Work, or a deep link.

## Header
- Ticket ID (mono) and full title (with `[Bug]`/`[CR]` prefix).
- Workflow status pill (click to change) and ticket type badge.
- "Open in GitHub" link when a GitHub issue is linked.
- Close (X) button.

## Body sections
- **Description** — markdown, edit-in-place (PMBA).
- **Acceptance criteria** — editable markdown; a **Generate with AI** button drafts criteria from title + description.
- **Estimates** — FE / BE / Project columns with original vs current values, edit-in-place. A diff badge shows when current differs from original.
- **Status per discipline** — FE and BE status chips (todo / in_progress / for_integration / done). A "Project override" toggle (PMBA) lets PMBA force the overall ticket status.
- **Assignees** — slot rows (FE, BE, Project) each with member avatars and a + button to open the Assign dialog.
- **Epic** — select with autocomplete.
- **Parent ticket** (for Bugs) — select with autocomplete.
- **Time logged** — list of time entries; click an entry to edit; "Log time" button opens the Log Time modal pre-filled with this ticket.
- **Comments** — threaded composer with markdown, mentions, attachments (drag-drop), and bot-posted GitHub activity.
- **CR controls** (CR tickets only) — Approve / Reject buttons with reasoning, plus the decider name and timestamp once decided.

## Interactions
- All edits save instantly (no explicit "Save").
- Updates from other users appear in real time.
- The sheet stays open across navigations until explicitly closed; the URL gets a `?ticket=…` hash so it can be linked.
