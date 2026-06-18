## Pool filters — multi-select with Planned / Committed sections

Replace the single-select FE/BE pool dropdowns in `SprintPoolingTable` with a new `SprintPoolFilter` that mirrors `MultiSelectFilter`'s visual pattern but exposes two grouped sections (Planned / Committed) with checkboxes.

### Files

**New**
- `src/features/sprints/SprintPoolFilter.tsx`

**Modified**
- `src/features/sprints/SprintPoolingTable.tsx` — swap filter UI, expand filter state to four arrays, update `visibleTickets` filtering, delete the now-unused `PoolFilterSelect`

**Untouched**: `MultiSelectFilter.tsx`, `usePoolData.ts`, `poolData.ts`, `TicketsListRow.tsx`, everything in `src/features/tickets/`.

### `SprintPoolFilter.tsx`

Props:
```ts
interface SprintPoolFilterProps {
  label: string;                  // "FE Sprint" | "BE Sprint"
  sprints: Sprint[];
  plannedSelected: string[];      // sprint ids
  committedSelected: number[];    // sprint numbers
  onPlannedChange: (ids: string[]) => void;
  onCommittedChange: (nums: number[]) => void;
}
```

Visual structure matches `MultiSelectFilter`:
- Trigger: `<Button variant="ghost">{label}:{summary} <ChevronDown/></Button>`
- Popover: `w-64 p-2 glass-strong`
- Two sections separated by `border-t border-white/5`, each with a header row containing the section title and All / · / None mini-actions, followed by a scrollable checkbox list of `Sprint {n}` rows
- Planned checkboxes use the primary token style (matches `MultiSelectFilter`); Committed checkboxes use `bg-accent/20 border-accent text-accent` to mirror the active-sprint badge in `TicketsListRow`

Summary label:
- nothing selected → `Any`
- only planned → `Planned: S{n}, S{n}`
- only committed → `Active: S{n}, S{n}`
- both → `{plannedCount + committedCount} filters`

Reused primitives only: `Popover`/`PopoverTrigger`/`PopoverContent`, `Button`, `Check`/`ChevronDown` from lucide, `cn`. No edits to `MultiSelectFilter`.

### `SprintPoolingTable.tsx`

Replace state:
```ts
const [fePlannedFilter, setFePlannedFilter] = useState<string[]>([]);
const [feCommittedFilter, setFeCommittedFilter] = useState<number[]>([]);
const [bePlannedFilter, setBePlannedFilter] = useState<string[]>([]);
const [beCommittedFilter, setBeCommittedFilter] = useState<number[]>([]);
```
Empty array = no filter.

Update `visibleTickets` to AND the four filters:
- planned FE/BE: match against `poolData.byTicket.get(t.id)?.fe|be`
- committed FE/BE: match any of `poolData.activeByTicket.get(t.id)?.fe|be` against the selected sprint numbers

Replace `extras` in `ProjectTicketsToolbar` with two `<SprintPoolFilter>` instances (FE + BE) wired to the four state pairs and the `sprints` list already available in the component.

Delete `PoolFilterSelect` from this file (no other consumers).

### Notes

- Planned + Committed filters within a discipline are ANDed so users can find e.g. "planned for S2 but actively worked in S1".
- `poolData.activeByTicket` already exists from the previous change — no data layer work needed.
- No changes to bulk-assignment menus or anything outside the filter UI + filtering logic.
