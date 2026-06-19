## Ticket detail panel — restructure layout and UX

Restructure the ticket detail sheet into a wider panel with a persistent summary bar, reorder tabs so Status comes first, regroup the status-tab fields into a compact grid, expose estimates revision via a hint label, move Delete into an overflow menu, and add a per-person hours summary above the time log list.

### 1. `src/features/tickets/TicketDetailSheet.tsx`

- Widen `SheetContent` from `sm:max-w-xl` to `sm:max-w-3xl`.
- Reorder tabs to **Status | Acceptance | Discussion** (rename "Detail" → "Status", value `"detail"` → `"status"`). Update `TabsContent` values to match.
- Update `defaultTab` logic: `"acceptance"` if `ticket.acceptance_criteria` is non-empty, otherwise `"status"`.
- Add `useState<number>(0)` `logCount` at sheet level; pass `setLogCount` down through `TicketDetailBody` → `TimeLogsPanel`.
- Insert a **summary bar** between `TicketDetailHeader` and `Tabs`, always visible regardless of active tab:
  - FE assignees (avatar + name + `FE` chip) and BE assignees (avatar + name + `BE` chip), derived from `ticket.assignees` filtered by `slot`.
  - Burn bar: filled width = `min(100, totalActual / totalEst * 100)`, color tokens `health-good` / `health-warn` / `health-bad` at 80% / 100% thresholds; label `formatHours(totalActual) / formatHours(totalEst)`.
  - Trailing `{logCount} time logs` text.
  - Derived values:
    ```ts
    const feAssignees = ticket.assignees.filter(a => a.slot === "FE");
    const beAssignees = ticket.assignees.filter(a => a.slot === "BE");
    const totalActual = ticket.actual_frontend_hours + ticket.actual_backend_hours + ticket.actual_project_hours;
    const totalEst = ticket.current_fe_estimate + ticket.current_be_estimate + ticket.current_project_estimate;
    const burnPct = totalEst > 0 ? (totalActual / totalEst) * 100 : 0;
    ```
- Add imports: `MemberAvatar` from `@/components/MemberAvatar`, `formatHours` + `cn` from `@/lib/utils`.

### 2. `src/features/tickets/detail/TicketDetailBody.tsx`

New order inside the Status tab:

1. `StatusBlock` — unchanged.
2. `EstimatesPanel` — rendered exactly as today (no wrapper, no reach-in). Click-to-revise is **already wired** via the panel's existing internal Adjust control bound to `onAdjustEstimate`. Below the panel, when `isPMBARole && !editing`, render a small `text-dim text-xs` hint: "Click an estimate to revise". No modification to `EstimatesPanel` internals; no external wrapping of `Stat` cards.
3. **Fields grid** (`grid grid-cols-3 gap-4`): Epic | Version | Parent ticket. Replaces the three stacked blocks. Parent column only when `ticket.ticket_type !== "Proj"`. Each cell: small `text-dim` label + either the existing editor (`EpicSelect` / inline version input / `ParentTicketSelect`) when `isPMBARole`, or read-only text when not. **All existing save logic preserved verbatim.**
4. `AssigneeBlock` — unchanged, just repositioned.
5. `TimeLogsPanel` — unchanged behaviour, now also receives `onLogCount`.
6. **Footer row**: `Updated {format(new Date(ticket.created_at), "d MMM yyyy")}` on the left (using `created_at` since `updated_at` is not on `TicketRow`); overflow `DropdownMenu` on the right (PMBA only) containing a single `Delete ticket` item wired to the existing `editor.handleDelete`.

Remove the standalone "Delete ticket" block. Add imports: `DropdownMenu*` from `@/components/ui/dropdown-menu`, `MoreHorizontal` from `lucide-react`.

### 3. `src/features/tickets/detail/TimeLogsPanel.tsx`

- Accept new optional `onLogCount?: (n: number) => void` prop; call it in a `useEffect` whenever `logs.length` changes.
- Compute `perPerson` with `useMemo` over `logs`: sum hours per `user_id`, keep name + avatar color only — **no discipline label** (a user may have both FE and BE logs on one ticket; the total is the useful number).
- Render a horizontal summary row above the existing log list when `logs.length > 0`: avatar + name + total hours per person.
- No changes to pagination, editing, or fetch logic.

### Constraints

- No changes to `StatusBlock`, `EstimatesPanel`, `AssigneeBlock`, `AcceptanceCriteria`, `TicketComments`, `useTicketEditor`, `TicketDetailHeader`, or any hook.
- No new Supabase queries; all data derived from already-fetched `ticket` and `logs`.
- All existing save logic (epic, version, parent, estimate, delete) preserved exactly — layout-only changes.

### Technical notes

- `logCount` state lives in `TicketDetailSheet`; threaded via a new optional `onLogCount` prop down through `TicketDetailBody` → `TimeLogsPanel`. `TicketDetailBody`'s Props interface gains `onLogCount?: (n: number) => void`.
- Burn-bar color thresholds use the existing `health-good` / `health-warn` / `health-bad` semantic tokens already defined in `index.css`.
- `EstimatesPanel` confirmed to already expose `onAdjustEstimate(slot)` via its own Adjust button — nothing to wrap externally.
- `TicketRow` does not include `updated_at`; footer uses `created_at`.
