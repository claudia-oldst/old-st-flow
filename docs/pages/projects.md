# Projects screen

**Route:** `/` — workspace home for any signed-in user.

A searchable, filterable grid of every project the user has access to.

## Header
- Eyebrow: "WORKSPACE".
- Title: "Projects".
- Subtitle: "Active client engagements and internal builds."
- Top-right primary action: **+ New project** button.

## Toolbar
Below the header:
- **Search** input (debounced 200 ms) — matches name, acronym, client name.
- **Status** segmented control — Active / Archived / All. Default: Active.
- **Sort** dropdown — Newest, Oldest, Name A–Z, etc.
- **Clear filters** chip — appears only when filters/search are non-default.

All toolbar state is reflected in the URL (`?q=…&status=…&sort=…&page=…`), so links and refreshes preserve the view.

## Grid
- Responsive 1/2/3-column grid of project cards.
- Each card shows: acronym chip, project name, client name, ticket count, member avatars (overlapping), an archived badge when applicable, and a tiny last-activity timestamp.
- Clicking anywhere on a card opens that project's workspace.

## Pagination
- Footer shows "Showing N–M of T" plus a numeric pager. Page resets to 1 whenever filters change.
- Skeletons fill the grid while loading.
- Empty state ("No projects match your filters" or "No projects yet") includes a Clear filters CTA when filters are active.

## Create project dialog
Opened from the **+ New project** button.
- **Name** — free text, required.
- **Acronym** — 3–5 letters, auto-uppercased, used as the prefix in ticket IDs. As you type, a hint line previews `ACME-001`, `ACME-002`.
- Duplicate acronyms are rejected with a toast.
- On success: dialog closes, list reloads, view jumps to page 1, toast "Project created".
