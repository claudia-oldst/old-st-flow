## Goal

1. Every new ticket must have an **Epic** selected (title is already required and acts as the description).
2. An estimate is "set" when its value is filled in — **`0` counts as an estimate**; only **blank/NULL** means unestimated.
3. Before an assignee can log time (or start a timer) on a ticket where their discipline has no estimate, they must first enter the **original estimate** for that discipline.

## 1. Required Epic on creation

`EpicSelect` already supports inline creation (type a name → "Create '…'"), so no new UI is needed — we just make epic required.

**Add Tickets dialog** (`useDraftRows` + `DraftRow`):
- `validDrafts` now requires `title.trim()` AND `epicId !== null`.
- Show the EpicSelect with an error ring + "Epic required" hint when the user tries to submit with it empty.
- Update the Create button counter to reflect drafts that are fully valid.

**Quick add row** (`QuickAddRow`):
- Same rule — disable submit until epic is chosen; show "Epic required" hint.

**Schema** (`src/lib/schemas/ticket.ts` + test): make `epic_id` required (non-null `number`). Update tests.

## 2. Blank vs zero estimate

Today the create paths coerce empty FE/BE/Project inputs to `0`, hiding "no estimate". To support the new rule we treat **blank input = NULL** and **`0` = a real estimate**.

- **DB migration**: drop `NOT NULL` / `DEFAULT 0` on the six estimate columns on `public.tickets`
  (`original_fe_estimate`, `original_be_estimate`, `original_project_estimate`,
  `current_fe_estimate`, `current_be_estimate`, `current_project_estimate`).
  Update `enforce_proj_ticket_zero_fe_be` so its checks use `IS NOT NULL` and it doesn't overwrite NULLs with 0.
- **Create paths** (`useDraftRows`, `QuickAddRow`): if the user leaves an estimate field blank, insert `null` for both `original_*` and `current_*`. If they type `0`, insert `0`.
- **Numeric reads**: audit aggregation/display call sites (`useTicketCapacity`, board/health/portal sums) to coalesce `NULL → 0` for math while keeping the raw value for the gating logic. Most call sites already use `?? 0`.

## 3. Gate time-logging on missing estimate

For the assignee's chosen discipline (FE / BE / Project), if the ticket's `original_*_estimate IS NULL`, block normal logging and instead require them to set the original estimate first.

- `useLogTime` / `LogTimeModal`: detect missing original estimate for the active `discipline`. Render a "Set original estimate" prompt (single hours input, `0` allowed) with a Save button that updates both `original_*_estimate` and `current_*_estimate` on the ticket, then transitions to the normal Start Timer / Manual Log UI.
- `LogTimeWithCapacityCheck`: pass through the same gate.
- `startTicketTimer` and `StartGroupTimerDialog`: before starting a timer, if the user's discipline has a NULL original estimate, open the same "Set estimate" prompt; on save, proceed to start the timer.
- PMBA-initiated flows that don't go through the assignee log-time path aren't gated.

## 4. Files to touch

- `src/lib/schemas/ticket.ts` + `src/lib/schemas/ticket.test.ts`
- `src/features/tickets/add-dialog/useDraftRows.ts`
- `src/features/tickets/add-dialog/DraftRow.tsx`
- `src/features/tickets/QuickAddRow.tsx`
- `src/features/timelog/log-time/useLogTime.ts`
- `src/features/timelog/LogTimeModal.tsx`
- `src/features/timelog/LogTimeWithCapacityCheck.tsx`
- `src/features/timelog/startTicketTimer.ts`
- `src/features/timelog/StartGroupTimerDialog.tsx`
- Supabase migration: drop NOT NULL / DEFAULT 0 on the six estimate columns and adjust `enforce_proj_ticket_zero_fe_be`.

## Out of scope

- Existing tickets keep their current values; the new "blank" state only arises from newly created tickets.
- No change to the AI copy button on acceptance criteria, portal layout, or roles.
