# Project workspace shell

**Route:** `/projects/:id/*`

The frame around every project-scoped screen. Manages the project header, tab navigation, and access gating.

## Access gate
- Non-members see a centered "No access to this project" panel with an "Ask a PMBA…" hint and a back-link to the Projects screen.
- Members see the full shell.

## Header
- Back link "← All projects" (small, dim).
- Acronym chip (mono, e.g. `ACME`).
- Project name in large display font.
- Optional " · client name" suffix.
- Gold "Vaulted" badge when the project is archived.
- Right cluster (icon buttons):
  - **Export** (download icon) — PMBA only, hidden when archived. Opens Export Project dialog.
  - **Settings** (cog) — opens Project Settings dialog; read-only for non-PMBA.

## Tab bar
Hairline-underlined nav with a moving underline on the active tab:
- **Tickets** (default)
- **Change Requests** — client-facing CR list
- **Estimate Revisions** — PMBA only
- **Sprints**
- **Health**
- **Client** — PMBA only

Each tab swaps the body without affecting the header.

## Archived state
When the project is archived, the tab bar and routes are replaced by the **Vault Dashboard** — a read-only summary with rehydrate/download actions.
