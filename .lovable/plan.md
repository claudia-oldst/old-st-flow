## Goals

1. Make the right-side **Client preview** in `ClientPortalEditor` collapsible so the PMBA gets a wide editing area.
2. In the **"Epics with scope changes"** editor list, hide cards for epics whose `Show to client` is toggled off (already saved as `included = false`).
3. In the **client-facing `PortalView`**, add a **trend-over-time graph under the "Epics" heading**, with an expandable section showing per-epic detail — limited to epics that PMBA has marked `Show to client` (and that have an `included` summary record).

---

## Changes

### 1. `src/features/client-portal/ClientPortalEditor.tsx`

- Add `previewOpen` state (default `true`).
- Replace the fixed `grid lg:grid-cols-[420px_1fr]` with a dynamic layout:
  - When open: `lg:grid-cols-[420px_1fr]` (current behaviour).
  - When collapsed: single column, controls take full width; preview becomes a thin collapsed strip with an "Show preview" button.
- Wrap the right column in a `Collapsible` (or conditional render) with a header bar containing a chevron toggle and the label "Client preview". The toggle button stays visible in both states (place it as a small floating/sticky button on the controls column when collapsed).
- In the "Epics with scope changes" block, change the filter from
  `payload.epics.filter((e) => epicDeltas.has(e.id))`
  to also exclude epics whose saved summary has `included === false`:
  `payload.epics.filter((e) => epicDeltas.has(e.id) && (e.included ?? true))`.
  (`PortalEpic.included` already comes from the RPC payload.)
- Hide the entire "Epics with scope changes" panel when the resulting list is empty.

### 2. `src/features/client-portal/PortalView.tsx`

Under the existing `Epics` heading, before the per-epic cards list, insert a new **trend graph block**:

- New component `PortalEpicTrend` (defined in same file or new file `src/features/client-portal/PortalEpicTrend.tsx`).
- Props: `projectId: string`, `cutoff: Date`, `includedEpicIds: number[]` (computed from `epics.filter(e => (e.included ?? true) && e.total_tickets > 0).map(e => e.id)`).
- The PortalView already receives `payload.project.id` and `payload.project.cutoff`, so we can pass them through.
- Visual:
  - Always-visible aggregated line chart (Original / Current / Actual hours over time) for the union of included epics, capped at `cutoff` date — same recharts setup as `EstimateEvolution` trend.
  - A `Collapsible` "Show per-epic detail" toggle. When open, render one mini chart (or compact `EpicRow`-style bars) per included epic.
- Data source: query `tickets`, `ticket_estimate_changes` (status='approved'), `time_logs` (FE/BE), filtered by `project_id` and the included epic ids. This mirrors the math in `EstimateEvolution` but filtered to included epics and ending at the portal cutoff.
- Loading/empty states: skinny skeleton; "No trend data yet" if no series.

### 3. `src/features/client-portal/PortalView.tsx` — passing data

- Add an internal hook (or inline `useEffect`) inside `PortalEpicTrend` that loads tickets/changes/logs via `supabase` directly using `payload.project.id`. This keeps the public `/h/:hash` route working (the public page already uses anon Supabase via the existing RPC; these tables already have public-read RLS per the schema).
- Compute aggregated daily samples from project `start_date` (or earliest ticket) to `payload.project.cutoff` (cap ~120 buckets, same as `EstimateEvolution`).

### 4. No DB migration needed

The `included` flag is already on `project_epic_summaries` and surfaced in `PortalEpic.included`. All other data the new chart needs is already publicly readable.

---

## Layout sketch (editor, preview collapsed)

```text
┌──────────────────────────────────────────────────────────────┐
│  Snapshot · Link · Publish                  [▸ Show preview] │
├──────────────────────────────────────────────────────────────┤
│  Intro for client (full width textarea)                      │
├──────────────────────────────────────────────────────────────┤
│  Epics with scope changes (only included == true)            │
│   - large editable cards, 2-up on wide screens               │
└──────────────────────────────────────────────────────────────┘
```

When expanded, layout returns to two columns as today.

---

## Acceptance

- Toggling the preview chevron resizes the editor area; the publish/intro/epic editors gain full width when collapsed.
- An epic whose `Show to client` switch is OFF (saved) no longer appears in the editor's "Epics with scope changes" list.
- The public portal and the editor preview both show, under the "Epics" heading, a trend chart of Original/Current/Actual hours over time, plus an expandable section listing included epics. Excluded epics never appear in the trend.
