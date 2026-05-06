## Bug
The "Eye" card-display toggle (assignees, chips, bars, etc.) doesn't update the board live because `useCardDisplayPrefs()` is called twice — once in `ProjectTickets.tsx` (the toolbar) and once in `ProjectBoard.tsx`. Each call has independent React state. The hook only listens to `window` `storage` events, which fire for other tabs only — never the same tab — so the board stays stale until a refresh.

## Fix
In `src/features/tickets/useCardDisplayPrefs.ts`:
- Replace the per-instance state with a shared module-level store (subscribers list + `dispatchEvent`).
- On `setPrefs`, write to localStorage AND notify all in-tab subscribers (e.g. via `window.dispatchEvent(new Event('card-display-prefs-change'))` or a small pub/sub).
- Each `useCardDisplayPrefs()` call subscribes to that event and updates its local state.
- Keep the existing `storage` listener so cross-tab sync still works.

No DB changes. No prop-drilling needed; both consumers (toolbar + board) stay as they are and now stay in sync instantly.

## Out of scope
- Other localStorage-backed local hooks (filters/search) — they're scoped to a single component so don't have this issue.
