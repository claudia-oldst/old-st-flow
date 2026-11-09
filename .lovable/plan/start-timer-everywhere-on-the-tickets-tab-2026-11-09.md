# Start Timer everywhere on the Tickets tab

## What changes
1. **Button always visible** — the toolbar timer button shows on the Tickets tab in both "All" and "My tickets" (still hidden when a timer is already running, and still hidden on Feedback and Sprint pooling).
2. **Renamed** — button and dialog title read "Start Timer" (was "Start group timer").
3. **From the bulk bar** — when tickets are ticked, the bottom bulk bar gets a coral play icon (tooltip "Start timer"). Clicking it opens the same Start Timer dialog with the ticked tickets already selected; you confirm discipline/estimates there as today and press Start.
   - The dialog still only lists tickets you're assigned to, so you can only log against your own assignments. Ticked tickets you're not assigned to are left out, with a note: "N selected tickets skipped — you're not assigned".
   - Not shown on the Feedback bulk bar (feedback tickets don't track time).

## Technical details
- `ProjectTicketsToolbar.tsx`: drop `filterMine` from the button condition; label "Start Timer".
- `StartGroupTimerDialog.tsx`: title "Start Timer"; new optional `preselectedIds?: string[]` passed to `useStartGroup`, which seeds `selected` on open (intersected with eligible tickets) and exposes a skipped count.
- `BulkActionsBar.tsx`: optional `onStartTimer?: () => void`; renders a `Play` icon button with `text-primary` (coral token) when provided and not `feedback`.
- `useProjectTicketsPage.ts` / `ProjectTickets.tsx` / `ProjectTicketsDialogs.tsx`: store `timerPreselect` ids; bulk bar's handler sets them and opens the dialog; toolbar button clears them.
- No database changes.
