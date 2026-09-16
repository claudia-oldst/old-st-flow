# Project lifecycle status

Give every project a lifecycle status, set from Project Settings under a new **Timeline** tab, shown as a colour pill on project cards, and filterable on the Projects page.

## Statuses

Pre-live, Confirmed (default), Definition, In Progress, Bug-Fixing, Monitor, Completed, On Hold, Closed Lost.

Each gets its own pill colour from the existing design tokens (e.g. neutral for Pre-live/Confirmed, blue-ish for Definition, coral/primary for In Progress, amber for Bug-Fixing, gold for Monitor, green for Completed, muted amber for On Hold, red for Closed Lost).

## Required information per status

Changing to one of these statuses requires the matching fields to be filled in before it can be saved:

| Status | Required |
| --- | --- |
| Definition | Project start date (the project's existing Start date field — confirm or set it) |
| In Progress | Development start date |
| Bug-Fixing | Handover date + closing window date |
| On Hold | Pause date + reason |
| Closed Lost | Closed date + reason |

Other statuses need nothing extra. Dates already captured stay in place when the status moves on, so the card can keep showing them.

## Timeline tab

A third settings tab (before Team) with:
- Status picker showing the nine statuses as coloured options.
- All lifecycle dates and reasons listed in order, each editable.
- Fields required by the currently selected status are marked and validated; saving with one missing shows an inline error and blocks the save.
- Read-only for everyone except PMBA, matching the other settings tabs.

## Project card

- Colour pill with the status name, next to the acronym chip.
- Beneath the existing ticket/member counts, a subtle line showing only the dates relevant to that status (e.g. In Progress → "Dev started 4 Mar"; Bug-Fixing → "Handover 2 Apr · Closes 16 Apr"; On Hold → "Paused 1 May").

## Projects page filter

A new status dropdown in the toolbar alongside the existing Active/Vaulted filter: "All statuses" plus the nine options, reflected in the URL like the other filters and applied in the projects query (including the pinned/favourites query).

## Technical notes

- Migration: new enum `project_lifecycle_status`; add to `public.projects`: `lifecycle_status` (not null, default `Confirmed`), `development_start_date`, `handover_date`, `closing_window_date`, `pause_date`, `pause_reason`, `closed_date`, `closed_reason`. Existing rows default to Confirmed. No RLS change needed — projects policies already cover it.
- Validation lives in a shared helper (`src/features/project/settings/lifecycle.ts`) exporting the status list, colours, required-field map, per-status card date descriptors, and a validator reused by the Timeline tab; Zod schema extended in `src/lib/schemas/project.ts`.
- New `ProjectTimelineTab.tsx` + state in `useProjectSettings.ts` (own save path so Details save is untouched).
- `ProjectCard.tsx` renders the pill and the subtle date line; `ProjectsToolbar.tsx` / `Projects.tsx` / `useProjectsList.ts` gain the `lifecycle` filter param.
- Docs: update `docs/pages/project-settings-dialog.md` and `docs/pages/projects.md`.
