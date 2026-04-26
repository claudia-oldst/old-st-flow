## Multi-Ticket Timer (revised)

A new dedicated CTA — separate from the per-ticket "Log time" — lets a developer start one timer that covers several of *their* assigned tickets, then split the elapsed time across them on stop.

### Where the CTA lives

In **`ProjectTickets.tsx`**, on the toolbar/hairline row, only when **My tickets** is the active filter (works in both **Board** and **List** views). Placed next to the All / My tickets toggle.

- Label: **"Start group timer"** with a `Clock`/`Play` icon.
- Style: same as the existing per-ticket "Log time" CTA (default `Button` — solid foreground/background) so the group timer reads as the same family of action.
- Hidden when a group timer is already running for the current user (the running state is surfaced by the `TimerChip` in the top bar; clicking it opens the stop dialog).

### Discipline scoping (single-discipline only)

The user can only log time for the discipline they're assigned for the project (`useProjectRole`):

- `Frontend` → discipline locked to **FE**.
- `Backend` → discipline locked to **BE**.
- `Fullstack` → user picks **FE or BE** in the start modal (one only — a single timer can't cover both disciplines).
- `QA` / `PMBA` → discipline locked to **Overhead**.
- No project role → CTA hidden.

The selectable ticket list is filtered to tickets where the user is actually assigned to the chosen discipline slot (FE/BE). Overhead users see all their assigned tickets regardless of slot.

### Start flow

Clicking the CTA opens a **"Start group timer"** modal:

1. **Discipline display** — locked label for Frontend/Backend/QA/PMBA; FE/BE toggle for Fullstack.
2. **Search bar** + **filter chips** (Status: To-do / In progress; Type: Standard / Bug / CR; Epic) over the list of the **current user's assigned tickets in this project** (open ones — exclude `done` category), further filtered to the chosen discipline's slot.
3. **Multi-select list** — each row: checkbox, `formatted_id`, title, status chip. "Select all visible" / "Clear" helpers.
4. **Start** — disabled until ≥1 ticket selected. Writes `active_timers` (primary = first selected) and bulk-inserts all selections into a new `active_timer_tickets` join table.

### Running state (top bar)

`TimerChip` updates to show the group:
- 1 ticket: `OSL-001  00:24:05` (today's behavior).
- N tickets: `OSL-001 +N-1  00:24:05`, with the full id list in the tooltip.

Clicking the chip opens the **Review & save** dialog (instead of immediately committing as it does today).

### Stop flow — Review & save dialog

- Total elapsed (rounded to nearest minute).
- One row per ticket: id + title, **minutes input** (editable), **status dropdown** for the timer's discipline (To-do / In progress / Done; hidden for Overhead since there's no overhead status), **remove** button.
- **Global comment** textarea applied to every generated `time_logs` row.
- Live "Allocated X / Y min" indicator + **"Distribute remaining evenly"** helper.
- Initial split: whole minutes — each ticket gets `floor(total / N)`; **remainder added to the first ticket**.
- **Save** → bulk-insert `time_logs` rows, update changed discipline statuses, run backlog→active promotion per ticket, clear the timer.
- **Discard** drops the timer.
- Total under 1 minute → auto-discard, same as today.

---

## Technical plan

### Database (migration)

```
active_timer_tickets (NEW)
  user_id    uuid not null
  ticket_id  uuid not null
  position   int  not null default 0
  PRIMARY KEY (user_id, ticket_id)
  RLS: same permissive "all v1" policies as active_timers
```

`active_timers` is unchanged — its existing `ticket_id` becomes the "primary" ticket. On start we insert all selections (including primary) into `active_timer_tickets` with sequential `position`. On stop/discard we delete from both tables for that `user_id`. No changes to `time_logs` schema.

### Frontend

- **`src/store/timer.ts`** — extend with `tickets: Array<{ id, formatted_id, title, position }>` and a `setTickets` action.
- **`src/components/TimerSync.tsx`** — also load + subscribe to `active_timer_tickets` for the current user, joined with `tickets` for display fields.
- **`src/components/TopBar.tsx`** (`TimerChip`) — render `OSL-001 +N` summary; open the new `StopGroupTimerDialog` on click instead of inline-committing. Single-ticket case still works (N=1 with no suffix).
- **`src/features/timelog/StartGroupTimerDialog.tsx`** (new) — discipline display/picker, search + filter chips, multi-select list, Start button.
- **`src/features/timelog/StopGroupTimerDialog.tsx`** (new) — review-and-save UI described above.
- **`src/features/tickets/ProjectTickets.tsx`** — render the "Start group timer" CTA in the toolbar when `filterMine && user && role` (visible in both Board and List views). Pass the user's assigned, non-done tickets for this project + the project role into the start dialog.

The existing per-ticket `LogTimeModal` is unchanged.

### Files to add / edit

- New migration: `active_timer_tickets` table + RLS.
- New: `src/features/timelog/StartGroupTimerDialog.tsx`, `src/features/timelog/StopGroupTimerDialog.tsx`.
- Edit: `src/store/timer.ts`, `src/components/TimerSync.tsx`, `src/components/TopBar.tsx`, `src/features/tickets/ProjectTickets.tsx`.
