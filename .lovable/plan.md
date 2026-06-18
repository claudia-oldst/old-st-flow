## Scope

Fix audit findings High 1–3 and Medium 4, 6, 7, 8. Only correctness fixes (null-status handling, week-bucket boundary) touch business logic; the rest is refactor.

---

## High

### 1. `WeeklyBurnPanel` — fetch window matches render window
**File:** `src/features/health/overview/WeeklyBurnPanel.tsx`

Change `since` from `addWeeks(thisWeek, -10)` to `addWeeks(thisWeek, -8)` so the query range exactly matches the 9 rendered buckets (−8…0). No render changes.

### 2. `ProjectHealth` — UTC ambiguity on `projectStart`
**File:** `src/features/health/ProjectHealth.tsx` (line 53)

Replace the UTC end-of-day with local end-of-day. Important: the literal must be `T00:00:00` with **no `Z` suffix** — bare ISO strings without timezone are parsed as local in all evergreen browsers, which is exactly what we want here.

```ts
const startMs = projectStart
  ? (() => {
      const d = new Date(`${projectStart}T00:00:00`); // local, no Z
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    })()
  : null;
```

### 3. Deduplicate `SprintGantt + empty state`
**New file:** `src/features/sprints/SprintGanttOrEmpty.tsx`

The component **must own the fetch** — otherwise nothing is deduplicated. Signature:

```ts
export function SprintGanttOrEmpty({ projectId }: { projectId: string }) {
  const { data: sprints = [] } = useSprints(projectId);
  if (sprints.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
        No sprint timeline available yet.
      </div>
    );
  }
  return <SprintGantt projectId={projectId} sprints={sprints} hideExport />;
}
```

**Edits:**
- `src/features/client-portal/ClientPortalEditor.tsx` — delete local `SprintGanttPreview`, drop `useSprints` + `SprintGantt` imports, render `<SprintGanttOrEmpty projectId={id} />`.
- `src/pages/ClientPortalPublic.tsx` — replace inline ternary in the Timeline tab with `<SprintGanttOrEmpty projectId={data.project.id} />`; remove `useSprints` + `SprintGantt` imports and the now-unused `sprints` variable.

---

## Medium

### 4. `EpicRiskTable` — explicit null-status handling
**File:** `src/features/health/overview/EpicRiskTable.tsx`

Track unknowns separately so they don't inflate backlog/risk. `total` for risk math excludes unknown; estimate/actual sums still include all epic tickets.

```ts
let unknown = 0;
...
const cat = t.status_id ? catById.get(t.status_id) : undefined;
if (cat === "done") done++;
else if (cat === "dev done") devDone++;
else if (cat === "active") active++;
else if (cat === "backlog") backlog++;
else unknown++;
```

Set `total = done + devDone + active + backlog`. Skip-row guard becomes `if (total === 0 || currentEst === 0) continue;`.

### 6. Extract a generic `SegmentedBar` primitive
**New file:** `src/features/_shared/SegmentedBar.tsx`

Must be N-segment generic (PortalView's `DisciplineRow` uses 2 segments, `EpicRiskTable` uses 4, `PortalEpicTable` uses 2). Implementation iterates over the `segments` array — no hardcoded slot count:

```ts
interface Props {
  segments: { pct: number; className: string }[];
  className?: string; // applied to track; defaults to "h-2 bg-white/5"
}

export function SegmentedBar({ segments, className }: Props) {
  return (
    <div className={cn("flex w-full rounded-full overflow-hidden", className ?? "h-2 bg-white/5")}>
      {segments
        .filter((s) => s.pct > 0)
        .map((s, i) => (
          <div key={i} className={cn("h-full", s.className)} style={{ width: `${s.pct}%` }} />
        ))}
    </div>
  );
}
```

Replace in-place usage and delete the local `Segment` helper in `EpicRiskTable.tsx`. Update `PortalView.DisciplineRow` and `PortalEpicTable` row bar to use it.

### 7. Replace hardcoded `hsl(217 91% 60%)` with a token
**Edit `src/index.css`:**
```css
--chart-in-progress: 217 91% 60%;
```

**Edit `tailwind.config.ts`** `colors` extend:
```ts
"chart-in-progress": "hsl(var(--chart-in-progress))",
```

**Replace all 5 usages:**
- `PortalEpicTable.tsx`, `PortalView.tsx` — drop `style={{ background: "hsl(217 91% 60%)" }}`, add `bg-chart-in-progress` className (or pass via `SegmentedBar` segment).
- `EpicRow.tsx` — the prop is a color string passed to a styled `BarRow`, so use `"hsl(var(--chart-in-progress))"` (a literal CSS string, not a Tailwind class).
- `PortalTrendChart.tsx`, `EstimateTrendChart.tsx` — Recharts ignores Tailwind classes on SVG. Use `stroke="hsl(var(--chart-in-progress))"` exactly (literal string).

### 8. Move `DateRangeControl` out of `health/`
**Move:** `src/features/health/DateRangeControl.tsx` → `src/features/_shared/DateRangeControl.tsx`.

**Update imports in:**
- `src/features/estimates/ProjectChangeRequests.tsx`
- `src/features/change-requests/ProjectChangeRequestTickets.tsx`

`ProjectHealth.tsx` already dropped its import in the prior refactor — verify after the move that no `DateRangeControl` import remains anywhere under `src/features/health/`.

---

## Verification

After edits, rely on the auto-build, then visually re-check:
- Project Health rings + weekly burn (bars unchanged).
- Epic risk table (doneness segments, percentages, pills unchanged for healthy data).
- Client portal preview + public portal Timeline tab (renders gantt or empty state identically).
- In-progress blue bar/line color matches previous shade across portal + estimate evolution charts.

## Out of scope

Mediums 5, 9 and all Lows — flagged in the prior audit but not addressed this round.
