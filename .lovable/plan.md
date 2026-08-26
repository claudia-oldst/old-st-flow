# Epic Risk Table — sortable by size, burn, done, and name

## Goal
Add a **Sort by** control to the Epic Risk table so the user can reorder rows by original/current estimate, actual hours, estimate delta, % burned, % done, or epic name.

## Current state
`src/features/health/overview/EpicRiskTable.tsx` always sorts rows by risk category first, then by `% burned` descending. There is no user-facing sort control.

## Changes

### 1. `src/features/health/overview/EpicRiskTable.tsx`
- Add local state for sort selection:
  ```ts
  type SortKey = "originalEst" | "currentEst" | "actualHours" | "delta" | "burnPct" | "progressPct" | "name";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "burnPct", dir: "desc" });
  ```
- Add a sort UI in the card header, to the left of the existing legend:
  - A shadcn `Select` with options:
    - Original Estimate Size
    - Current Estimate Size
    - Actual Logs
    - Current vs Original Delta
    - % Burned
    - % Done
    - A-Z
  - An adjacent direction button (`ArrowUp` / `ArrowDown` from `lucide-react`) that toggles `asc`/`desc`. Numeric options default to `desc`; `name` defaults to `asc`.
- Compute `delta = currentEst - originalEst` inside each row.
- Replace the current hard-coded sort (`riskOrder`, then `burnPct`) with a comparator driven by `sort.key` and `sort.dir`. When sorting, do not retain the old risk grouping so the selected order is respected.
- Keep the existing risk pill, progress bar, and burn display unchanged.

## Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Epic risk — doneness vs estimate burn      [Sort by ▼] [↓] Legend  │
├─────────────────────────────────────────────────────────────────────┤
│ Epic          Doneness        Estimate burn           Risk          │
├─────────────────────────────────────────────────────────────────────┤
│ Login flow    ████░░░░░░░░    145% burned · 29h / 20h  At risk      │
│ Onboarding    ██░░░░░░░░░░     80% burned · 8h / 10h   Watch        │
│ API v2        ██████░░░░░░     60% burned · 60h / 100h Healthy     │
└─────────────────────────────────────────────────────────────────────┘

Sort dropdown open:
  Original Estimate Size
  Current Estimate Size
  Actual Logs
  Current vs Original Delta
  % Burned
  % Done
  A-Z
```

## Technical details
- One component edited: `src/features/health/overview/EpicRiskTable.tsx`.
- Reuses existing `@/components/ui/select` and `lucide-react` icons.
- No database, RLS, or prop-signature changes.
- Sorting stays client-side; no new data fetches.
- Default sort is `% Burned` descending to stay close to the current visual emphasis.
