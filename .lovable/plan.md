# Client portal: scope to specific versions

Let the PMBA choose which ticket versions the client portal shows, so the public link reflects only the versions currently being built. Default stays "all versions" — existing portals are unchanged.

## What the PMBA sees

In the Client Portal editor toolbar, next to the as-of date picker, a new **Versions** multi-select lists every version used by tickets on the project, plus a "No version" option for tickets without one. Leaving it empty means all versions.

- The selection saves with **Update** / **Publish**, exactly like the intro text and cutoff date.
- The live preview immediately recomputes with the selection applied, so the PMBA sees what the client will see.
- A small note under the picker states what is in scope, e.g. "Portal scoped to: v1, v2".

## What the client sees

With versions selected, every tab of the public portal is scoped to tickets in those versions:

- **Summary** — epic rows, hours (Act/Cur/Orig), ticket counts and totals only count in-scope tickets. Epics with no in-scope tickets drop out of the table.
- **Timeline** — the sprint Gantt only plots in-scope tickets.
- **Change Requests** — only CRs on in-scope tickets are listed and approvable.

Epic discounts stay applied as authored (they are epic-level, not per version); the totals strip keeps showing them.

## Technical notes

Database migration:

- Add `projects.client_portal_versions text[]` (nullable; `NULL` or empty = all versions).
- Update four security-definer RPCs to apply the filter, reading the column from the already-loaded project row:
  - `get_client_portal(_hash)` and `get_project_portal_preview(_project_id, _cutoff)` — add a version predicate to the `ticket_rows` CTE; drop epics that end up with zero in-scope tickets.
  - `get_client_portal_gantt(_hash)` — filter the `tickets` sub-select.
  - `get_client_portal_change_requests(_hash)` — filter both `baseline_tickets` and `cr_tickets`.
- Version predicate (treats blank/NULL version as the "No version" bucket):
  `versions IS NULL OR cardinality(versions) = 0 OR COALESCE(NULLIF(btrim(t.version), ''), '_none') = ANY(versions)`
- `get_project_portal_preview` gains an optional `_versions text[] DEFAULT NULL` argument so the editor can preview an unsaved selection; when NULL it falls back to the saved column.

Frontend:

- `useClientPortalEditor.ts` — hold `selectedVersions` state, load from `project.client_portal_versions`, include it in the `Update`/`Publish` payloads, and pass it to the preview RPC.
- `usePortalData.ts` — pass versions through to `get_project_portal_preview` and add them to the preview query key.
- `PortalToolbar.tsx` — render the multi-select, reusing the existing `MultiSelectFilter` component and the `versionKeyOf` / `versionOptions` helpers already in `src/features/health/versionFilter.ts` (options sourced from `useProjectTickets`).
- No changes needed in `PortalView` / `PortalEpicTable` / `PortalTimeline` / `PortalChangeRequests` — they render whatever the RPCs return.
- Update `docs/pages/client-portal-editor.md` and `docs/pages/portal-summary.md`.
