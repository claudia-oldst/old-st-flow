# Client portal: scope the trend chart to the selected versions

Today the version multi-select scopes the portal's epic table, timeline and change requests, but the "Estimate trend over time" chart (and the per-epic mini-charts inside the expanded epic panels) still plots every ticket on the project. This makes the chart contradict the numbers in the table below it.

## What changes

- The aggregate trend chart on the Summary tab only counts tickets in the selected versions.
- The per-epic mini trend chart in an expanded epic row does the same.
- With no versions selected, behaviour is unchanged (all versions).
- This applies to both the PMBA preview (reacting live to the picker) and the published public link.

## Technical notes

The trend chart is client-side: `PortalEpicTable` calls `useTrendData(projectId)` and builds the series with `buildTrendSeries({ ticketFilter })`. The dataset already carries a `ticketVersion` map (`fetchTrendData.ts`), so the filter is a small addition — no change to the trend module itself.

- Add `versions: string[] | null` to `PortalProject` in `src/features/client-portal/types.ts`.
- Migration: have `get_client_portal(_hash)` and `get_project_portal_preview(_project_id, _cutoff, _versions)` include the effective version list in the returned `project` object (the preview echoes the `_versions` argument, falling back to the saved `client_portal_versions` column).
- `PortalView.tsx` — pass `payload.project.versions` down to `PortalEpicTable`.
- `PortalEpicTable.tsx` — extend the existing `ticketFilter` with a version predicate using `versionKeyOf` from `src/features/health/versionFilter.ts`; pass the selected versions through to `PortalEpicExpandedPanel`.
- `portal-epic/PortalEpicExpandedPanel.tsx` — apply the same version predicate in its `buildTrendSeries` call.
- Keep the current discount handling as-is (discounts are epic-level).
- Update `docs/pages/portal-summary.md` to note that the trend chart follows the portal's version scope.
