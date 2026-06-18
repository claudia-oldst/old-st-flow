## Plan — Planning tab display fixes

### Verifications

- **`onToggleSelect` signature:** Pool panel `Props` already declares `onToggleSelect: (id: string, shiftKey: boolean) => void` (matches `TicketsList` shape — `SprintWorkbench` wraps `toggle(id, "pool")` to satisfy it). Passing `false` as the second arg in the new div rows is fine; no shift-range selection needed.
- **Dev column header used/cap text:** That text lives inside `CapacityIndicator` (`{used}h / {cap}h` on line 26). `PlanningDevColumn` only renders the separate `+{overage}h` overage chip. So formatting `CapacityIndicator` covers both the top-bar total and the per-dev header bar; `PlanningDevColumn` only needs `formatHours` on the row `{h}h` and the `+{overage}h` chip.

### 1. Pool panel rework — tight div rows

**File:** `src/features/sprints/PlanningPoolPanel.tsx`

- Change panel root width `w-72` → `w-96`.
- Remove `TicketsList` and `GroupBySelect` imports and the `groupBy` state.
- Replace `TicketsList` with the same tight `<div>` row pattern from `PlanningDevColumn.tsx`. Each row:
  - `Checkbox` — toggles selection via `onToggleSelect(t.id, false)`; wrapped in a `data-checkbox` div with `stopPropagation` so the checkbox click doesn't also open the ticket.
  - `formatted_id` — `font-mono text-xs text-dimmer w-16 shrink-0`.
  - `title` — `text-xs truncate flex-1 min-w-0`.
  - Epic chip — `text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dim truncate max-w-20 shrink-0`, only if `t.epic_name`.
  - Hours — `current_fe_estimate` or `current_be_estimate` depending on `discipline`, rendered via `formatHours`.
- Row click → `onOpenTicket(t)`.
- Add a small "Select all" checkbox above the rows (header strip) that calls `onToggleSelectAll(filtered.map(t => t.id), select)` — preserves existing bulk-select behavior.
- `TicketsFilter` chip toolbar stays — epic filtering still works through it.
- No changes to pool filtering / selection logic.

### 2. Floating-point hours display

**New helper:** `src/features/sprints/hours.ts`

```ts
export function formatHours(h: number): string {
  const rounded = Math.round(h * 10) / 10;
  return `${rounded}h`;
}
```

**Apply to display only — no calculation changes:**

| File | Location |
|---|---|
| `PlanningPoolPanel.tsx` | Row hours (new div rows) |
| `PlanningDevColumn.tsx` | `{h}h` row hours + `+{overage}h` header chip |
| `CarryoverReviewPanel.tsx` | `{h}h` in rows |
| `CapacityIndicator.tsx` | `{used}h / {cap}h` label (covers both top-bar total and per-dev header bar) |

No changes outside `src/features/sprints/`. `TicketsList` and anything in `src/features/tickets/` is untouched.