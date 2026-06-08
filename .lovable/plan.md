# Refactor Sprint Planning to Reuse Existing Components

The sprints feature currently re-creates UI/data that already exist in the codebase. This plan removes the duplicates and wires sprints into the same primitives the Board and Tickets views use, so card visuals, data shapes, and tab chrome stay consistent across the app.

## What gets reused

| Currently in `features/sprints/…` | Replace with existing |
| --- | --- |
| `TicketCard.tsx` (custom mini-card) | `features/tickets/TicketCard` (full card with type icons, FE/BE bars, assignees, epic name, CR badge) controlled via `CardDisplayPrefs` |
| `useProjectTickets` inside `useSprintBoard.ts` (raw Supabase fetch of `tickets`) | `useProjectTickets` from `@/features/tickets/useProjectTickets` (returns normalized `TicketRow[]` with assignees + epic name already joined) |
| Custom tab buttons in `SprintsPage.tsx` | shadcn `Tabs` primitive from `@/components/ui/tabs` |
| Hand-rolled type-filter chip buttons in `BacklogPanel.tsx` | `FilterRow` from `@/features/tickets/filters/FilterPrimitives` (matches Tickets/Board filter styling) |
| Plain-text member name + role in `DeveloperLane.tsx` header | `MemberAvatar` + role badge styling already used in `TicketCard`/`ProjectTeam` |

## File-by-file changes

### Delete
- `src/features/sprints/TicketCard.tsx` — replaced by a tiny `DraggableTicketCard.tsx` that wraps the existing tickets `TicketCard` with `useDraggable` (mirrors `features/board/board/DraggableCards.tsx`).

### `src/features/sprints/DraggableTicketCard.tsx` (new, ~25 lines)
- Thin wrapper: takes `TicketRow`, a `dndId`, a `prefs?: Partial<CardDisplayPrefs>`, and `disabled?: boolean`.
- Renders `<div ref={setNodeRef} {...listeners} {...attributes}><TicketCard ticket={row} prefs={…} isDragging={isDragging} /></div>`.
- Two preset prefs:
  - **Backlog/Pool preset**: `{ type:true, id:true, chips:false, bars:true, assignees:true, projBadge:true }`
  - **Lane preset** (isolated discipline): same but `assignees:false`, and the consumer controls `forceBars`. Since the existing `TicketCard` doesn't natively hide a single discipline, the lane will still show both FE and BE bars — this matches how the Board renders cards in its own discipline columns. The discipline-isolation requirement is preserved at the data layer (lanes still show only cards `assigned_user_id = dev`), but per-card hour rendering uses the shared component.

### `src/features/sprints/useSprintBoard.ts`
- Remove the local `useProjectTickets` (and the Proj-filter). Re-export and use `useProjectTickets` from `@/features/tickets/useProjectTickets`, then filter `Proj` in the consumers (single `.filter(t => t.ticket_type !== "Proj")`).
- Update `remainingHours` callers to accept `TicketRow` (already exposes `current_fe_estimate`, `actual_frontend_hours`, etc. — drop-in compatible).
- Keep `useSprints`, `useSprintCapacities`, `useSprintTickets`, `useProjectSprintTickets`, `useProjectMembers` as-is.
- Adjust `useSprintTickets` return type to fetch `ticket_id` only, then resolve to `TicketRow` by joining against the project-wide `useProjectTickets` cache in `SprintWorkbench` (one source of truth for ticket shape).

### `src/features/sprints/types.ts`
- `remainingHours(t: TicketRow)` instead of raw `Ticket`. (Field names are identical, just a type swap.)
- Keep `SprintDiscipline`, `memberDisciplines`, `dndId` helpers.

### `src/features/sprints/SprintsPage.tsx`
- Replace the custom tab `<button>`s with `<Tabs value={tab} onValueChange={…}><TabsList><TabsTrigger value="forecast">…</TabsTrigger>…` from `@/components/ui/tabs`.

### `src/features/sprints/BacklogPanel.tsx`
- Replace the inline type-chip buttons with a column of `FilterRow`s under a `FilterSection title="Type"`.
- Continue using `EpicSelect`, `Input` for search, `Checkbox` for "Hide completed disciplines".
- Render results with `DraggableTicketCard` (backlog preset).

### `src/features/sprints/SprintPoolPanel.tsx`
- Render items with `DraggableTicketCard` (backlog preset).
- Keep the FE/BE totals header.

### `src/features/sprints/DeveloperLane.tsx`
- Render the member header using `MemberAvatar` (size `sm`) + name + role chip (`PROJECT_ROLE_COLORS[role]`) — same visual vocabulary as `ProjectTeam`.
- Render items with `DraggableTicketCard` (lane preset).
- Keep the capacity meter and `bg-destructive` overallocation flip.

### `src/features/sprints/SprintWorkbench.tsx`
- Pull `tickets: TicketRow[]` from the shared `useProjectTickets(projectId)`.
- Build a `ticketById` map and resolve `sprintTickets[i].ticket_id` → `TicketRow` for the pool and lane lists.
- All DnD semantics stay identical (`addTicketToPool`, `addTicketToLane`, `unpinTicketFromLane`, `removeTicketFromSprint`).

### `src/features/sprints/dnd.ts`
- No change. Already targets `sprint_tickets`/`ticket_assignees`/`time_logs` directly.

### `src/features/sprints/ForecastingCalendar.tsx`
- No card-related changes. (Already uses shadcn `Input`, `Button` — those are reused.)

## Out of scope
- No DB/RLS/grant changes — schema stays as is.
- No change to `ProjectWorkspace.tsx` routing (tab already wired).
- Forecasting Calendar UX (dates + per-member capacity table) is unchanged.