# Weekly Hours Progress Bar

Add a very thin horizontal bar directly beneath the `TopBar` that visualizes the current user's logged hours for the current work week (Mon–Fri) against a 40-hour target.

## Behavior

- Scope: time logs for `current user` where `logged_at` falls within Monday 00:00 → Friday 23:59:59 of the current week (local time).
- Target: 40 hours = 100% fill.
- Fill: thin coral/orange line (`--primary`) growing left-to-right; capped visually at 100% but if >40h, show full bar (no overflow styling for now).
- Empty state: bar track visible but unfilled when 0h.
- Updates: refetch on user switch and on realtime `time_logs` insert/update/delete for that user.
- Tooltip on hover: "X.Xh / 40h this week".

## Placement

- New component `WeeklyHoursBar` rendered in `src/App.tsx` (or wherever `TopBar` is mounted) immediately after `<TopBar />`, sitting flush below the nav, full width.
- Height: 2px. No padding. Sticky directly under the sticky TopBar so it stays visible on scroll.

## Technical

- New file: `src/components/WeeklyHoursBar.tsx`
  - Reads `useCurrentUser()` for `user.id`.
  - `useQuery` keyed by `["weekly-hours", userId, weekKey]` querying `time_logs` with `user_id = userId`, `logged_at >= monday`, `logged_at <= friday_end`, summing `hours`.
  - `useRealtimeReload([{ table: "time_logs", filter: \`user_id=eq.${userId}\` }], refetch)`.
  - Render: `<div class="sticky top-14 z-30 h-0.5 w-full bg-white/5"><div style={{width: pct+'%'}} class="h-full bg-primary transition-all" /></div>` wrapped with a Tooltip.
- Week boundaries via small helper (Monday as week start; ignore Sat/Sun by capping `to` at Friday end).
- Mount in `src/App.tsx` right under the existing `<TopBar />` invocation (need to verify where TopBar is rendered).
