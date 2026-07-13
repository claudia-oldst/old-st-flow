## Goal
Let users pick the date for a manual time log in the Log Time modal, alongside the duration.

## UX
In `LogTimeModal`'s **Manual entry** tab, add a **Date** field above the Duration input:
- Uses the existing shadcn `Popover` + `Calendar` + `Button` datepicker pattern already used elsewhere in the project.
- Defaults to today.
- Displays as `format(date, "PPP")` with a `CalendarIcon`.
- Cannot be set to a future date (disable days after today).

The Live timer tab is unchanged — timers always start "now".

## Implementation

### `src/features/timelog/log-time/useLogTime.ts`
- Add `loggedDate` state (default `new Date()`), a `setLoggedDate` setter, and reset it to today when the modal opens (same effect that resets discipline).
- In `handleManualLog`, insert `logged_at: loggedDate.toISOString()` into the `time_logs` row. Keep everything else (capacity check, promote-to-active, toast) as-is.
- Export `loggedDate` and `setLoggedDate` from the hook.

### `src/features/timelog/LogTimeModal.tsx`
- Pull `loggedDate` / `setLoggedDate` from the hook.
- In the Manual entry `TabsContent`, add a new field block above the `DurationInput`:
  - `Label`: "Date"
  - `Popover` + `PopoverTrigger` (outline `Button` showing formatted date) + `PopoverContent` with `Calendar mode="single" selected={loggedDate} onSelect={...} disabled={{ after: new Date() }} className="p-3 pointer-events-auto"`.

No other files change. Capacity math continues to key off the ticket's totals (not the picked day), matching current behavior.

## Verification
- Open a ticket → Log time → Manual entry → date defaults to today, can be changed, future dates disabled.
- Submit → new row in `time_logs` has `logged_at` = selected date; Time Logs panel shows the picked date.
- Live timer tab unchanged.
