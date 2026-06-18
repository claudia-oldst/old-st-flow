# Add "Collapse / Expand all" toggle above grouped tables

## Scope

A codebase audit shows only one table renders collapsible groups: `TicketsList` (`src/features/tickets/TicketsList.tsx`). It is reused by:

- **Tickets tab** (`ProjectTickets` → `TicketsList`)
- **Roadmap tab** (`SprintPoolingTable` → `TicketsList`)
- **MyWork page** (`TicketsList`)

So a single change in `TicketsList` covers every page that has a groupable table — no other consumer maintains its own group-collapse state.

## Change

In `src/features/tickets/TicketsList.tsx`:

1. Render a small right-aligned control row immediately above the group list, only when `groupBy !== "none"` and `groups.length > 1`.
2. The row contains a single ghost icon button:
   - When **any** group is currently expanded → show `ChevronsDownUp` icon + tooltip "Collapse all groups". Click → `setCollapsed(Object.fromEntries(groups.map(g => [g.key, true])))`.
   - When **all** groups are collapsed → show `ChevronsUpDown` icon + tooltip "Expand all groups". Click → `setCollapsed({})`.
3. Use existing tokens (`text-dimmer`, `hover:bg-white/[0.02]`, `h-7 w-7`, `rounded-md`) to match the surrounding glass styling. No new colors.

## Technical detail

```tsx
const allCollapsed = groups.length > 0 && groups.every(g => collapsed[g.key]);
const toggleAll = () =>
  setCollapsed(allCollapsed ? {} : Object.fromEntries(groups.map(g => [g.key, true])));
```

Rendered inside the existing `<div className="flex flex-col gap-3">`, before `groups.map(...)`:

```tsx
{groupBy !== "none" && groups.length > 1 && (
  <div className="flex justify-end -mb-1">
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={toggleAll} className="h-7 w-7 rounded-md flex items-center justify-center text-dimmer hover:bg-white/[0.04] transition">
          {allCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{allCollapsed ? "Expand all groups" : "Collapse all groups"}</TooltipContent>
    </Tooltip>
  </div>
)}
```

Add `ChevronsUpDown`, `ChevronsDownUp` to the existing `lucide-react` import; add `Tooltip`, `TooltipTrigger`, `TooltipContent` to the existing `@/components/ui/tooltip` import (the file already wraps content in `TooltipProvider`).

## Untouched

No other files. No new components, no prop changes, no state lifting — `collapsed` stays local to `TicketsList`, so every consumer (Tickets, Roadmap, MyWork) inherits the control automatically.
