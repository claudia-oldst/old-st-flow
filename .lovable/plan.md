# Quick-start timer from My Tickets

Add a small Play icon that appears on hover for tickets in **My Tickets** mode (Kanban cards and List view title cell). Clicking starts a single-ticket timer for the current user — no modal, no extra clicks. The button is hidden whenever the user already has a running timer, so existing logs can never be lost.

## Behavior

- **Visibility**: Play button renders only when ALL of:
  - Parent is in "My tickets" mode (`filterMine === true`)
  - Current user is assigned to the ticket (FE, BE, or Project slot)
  - `useTimerStore().active` is `null` — i.e. no timer currently running for this user
- **Hover only**: Tailwind `opacity-0 group-hover:opacity-100` (also visible on `group-focus-within` for keyboard).
- **Click**:
  1. Pick discipline from the user's slot on this ticket. Priority FE → BE → Project. In discipline-mode kanban the slot is already known on the card and is passed through as `forcedDiscipline`.
  2. Insert one row into `active_timers` (no replace — guaranteed empty by the visibility check) and one row into `active_timer_tickets` at position 0.
  3. `e.stopPropagation()` so the card-click (open detail sheet) does not fire.
  4. Toast: "Timer started on {formatted_id}".
- **If a timer somehow exists at click time** (race with realtime): the helper re-checks `active_timers` for the user; if a row exists, it aborts and toasts "Stop your running timer first." No data is overwritten.

## Files to change

**New** — `src/features/timelog/startTicketTimer.ts`
- `startTicketTimer({ userId, ticketId, discipline })` — selects `active_timers` for `userId`; if a row exists, returns `{ ok: false, reason: "active" }`. Otherwise inserts both rows. Returns `{ ok, error? }`.

**`src/features/tickets/TicketCard.tsx`**
- Add optional props: `showQuickStart?: boolean`, `currentUserId?: string`, `forcedDiscipline?: "FE" | "BE" | "Project"`.
- Subscribe to `useTimerStore((s) => s.active)` inside the card; only render the button when `showQuickStart && currentUserId && !active && user has a slot on the ticket`.
- Render a Play `<button>` absolutely positioned top-right (offset to `right-7` when the Proj "P" badge is shown), styled `h-6 w-6 rounded-full bg-primary text-primary-foreground shadow ring-1 ring-white/10 opacity-0 group-hover:opacity-100 transition`.
- onClick: stop propagation, derive discipline (use `forcedDiscipline` if provided, else FE→BE→Project priority from assignees), call helper, toast result.

**`src/features/board/ProjectBoard.tsx`**
- Thread `showQuickStart={filterMine}` and `currentUserId={user?.id}` through `Column` → `DraggableCard` → `TicketCard`, and `DisciplineColumn` → `DraggableDisciplineCard` → `TicketCard` (passing `forcedDiscipline={card.slot}` for discipline cards).

**`src/features/tickets/TicketsList.tsx`**
- Add props `showQuickStart?: boolean`, `currentUserId?: string`.
- In `renderCell` `"title"` case, wrap the title `<span>` in a `flex items-center gap-2 group/title` container; render the Play button to the right with `opacity-0 group-hover/title:opacity-100`.
- Same gate: requires `showQuickStart`, user assigned, and `useTimerStore.active === null`.

**`src/features/tickets/ProjectTickets.tsx`**
- Pass `showQuickStart={filterMine}` and `currentUserId={user?.id}` to `<TicketsList>`. Board already has access via its own `useCurrentUser` and `filterMine` state — no prop needed there.

## Technical notes

- Reuses `active_timers` + `active_timer_tickets` schema; no DB migration.
- `TimerSync` realtime subscription will hide the Play button across all visible cards the moment a timer starts (via the shared zustand store), and reveal it again the moment it stops.
- Helper double-checks for an existing timer before insert as a defensive guard against UI race conditions — never deletes or overwrites.
- Portal/read-only views never set `showQuickStart`, so the button is invisible there.
- `StartGroupTimerDialog` is unchanged and remains the multi-select entry point.
