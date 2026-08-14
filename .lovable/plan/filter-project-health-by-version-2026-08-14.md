# Filter Project Health by Version

Add a multi-select "Version" filter at the top of the Health tab that filters every metric on the page, so you can see the health of the project for, say, Version 1 and Version 2 only.

## What you'll see

- A "Version" multi-select control in the Health header row (next to "Create discount"), listing every distinct version used by tickets in this project, plus a "No version" entry for tickets with none.
- Default: all versions selected (identical to today's view).
- While a subset is selected, everything below reacts to it:
  - FE / BE / Project burn rings and Profitability panel
  - Weekly burn chart
  - Unassigned backlog count
  - Epic risk table (epics with no matching tickets drop out)
  - Estimate evolution: epic snapshots and the trend chart
- A small note appears when a filter is active, e.g. "Filtered to 2 of 5 versions", with a one-click reset.

## Discounts

Epic discounts are recorded per epic and discipline, not per version, so they can't be split across versions. When a version filter is active, discounts are excluded from the totals and the discounts list is hidden, with a short line explaining that discounts apply to the whole project. With all versions selected, behaviour is unchanged.

## Technical notes

- New state in `src/features/health/ProjectHealth.tsx`: `selectedVersions: string[]` (empty/`all` = no filtering). Options derived from `tickets` (`version?.trim()` or `_none`), reusing the existing `MultiSelectFilter` component from `src/features/estimates/MultiSelectFilter.tsx` (searchable).
- Filter `tickets` once in `ProjectHealth` and pass the filtered array down to the burn totals, `WeeklyBurnPanel`, and `EpicRiskTable` — those already take `tickets` as props, so no internal changes beyond `WeeklyBurnPanel`'s query key (it derives ticket ids from props; add the version key to its `queryKey` so it refetches per selection).
- `EstimateEvolution` gains a `versionFilter` prop; `useEstimateEvolution` receives it and applies it via the existing `ticketFilter` hook point in `buildTrendSeries`, and by filtering the ticket list passed to `buildEpicSnapshots`.
- `fetchTrendData` (`src/features/_shared/estimate-trend/fetchTrendData.ts`) must also select `version` and expose a `ticketVersion: Map<string, string | null>` on `TrendDataset` (mirroring `ticketEpic`) so the trend can filter by version without a second query.
- Discount handling: when a version filter is active, pass an empty discount array into the totals and `useEstimateEvolution`.
- Docs: update `docs/pages/project-health.md` with the new filter.

No database or RLS changes are needed — `tickets.version` already exists.
