# Weekly Burn — hover shows per-member split

## Goal
Hovering any bar in the **Weekly burn rate** panel (Project Health) shows that week's hours broken down per team member, instead of the current plain "Aug 18: 24h" title tooltip.

## Current state
`src/features/health/overview/WeeklyBurnPanel.tsx` fetches `time_logs` (only `logged_at, hours`) for the project's tickets over the last 9 weeks and renders each bar with a native `title` tooltip. `time_logs` has an FK to `team_members`, so member names can be embedded in the same query.

## Changes

1. **`WeeklyBurnPanel.tsx`**
   - Extend the `time_logs` select to include `user_id` and `member:team_members(name)`.
   - When bucketing logs into weeks, also accumulate hours per member (name + hours) inside each week bucket, sorted highest first.
   - Replace the native `title` attribute on each bar with a shadcn `Tooltip` (same pattern as `WeeklyHoursBar`) wrapping the bar:
     - Header: week start date + total hours (same as today).
     - Rows: coloured dot, member name, hours (mono font), one row per member who logged that week.
   - Weeks with no logs keep a simple "0h" tooltip line.

No database, RLS, or layout changes. The realtime invalidation and version-filter cache key stay as-is.

## Wireframe

```text
Weekly burn rate                              ↑ 58%
┌──────────────────────────────────────────────┐
│                  ┌─────────────────────┐     │
│                  │ Aug 18 · 16.9h      │     │
│   ▁  ▁  ▁  ▁  ▁  │ ● Julian    9.5h    │     │
│   ▁  ▁  ▂  ▆  █  │ ● Dennis    5.2h    │     │
│                  │ ● Belmark   2.2h    │     │
│                  └─────────────────────┘     │
└──────────────────────────────────────────────┘
 8 wks ago                        16.9h this week
```

## Technical details
- One component edited: `src/features/health/overview/WeeklyBurnPanel.tsx`.
- Tooltip via existing `@/components/ui/tooltip` with `TooltipProvider`.
- Per-member split derived client-side in the existing `useMemo`; query returns one extra embedded field only.
- Coloured dot can reuse `team_members.avatar_color` (also available via the embed) for consistency with `MemberAvatar`.
