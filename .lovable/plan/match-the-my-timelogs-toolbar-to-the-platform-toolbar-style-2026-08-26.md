# Match the My Timelogs toolbar to the platform toolbar style

The My Timelogs page currently wraps its controls in a floating glass card, which doesn't match the ticket/board toolbars used everywhere else. Restyle it to the standard toolbar pattern.

## What changes

- Replace the `glass rounded-2xl p-3` toolbar card with the shared sticky toolbar shell used on Project Tickets: full-bleed sticky bar under the top nav, translucent background with blur and a hairline bottom border, `flex items-center gap-3 flex-wrap`.
- **Group by** uses the same markup as the shared group-by control: small `Group by` label plus an `h-8` compact select (Month / Week / Day).
- **Project filter** becomes a `Filter`-style trigger: outline button, `h-8`, filter icon, text label, and an active-count pill in the same style as the ticket filter, opening the existing multi-select popover.
- **Date range** control stays as-is (already a platform-standard control) and remains pushed to the right with `ml-auto`.
- Totals line and the rest of the page are unchanged.

```text
┌ sticky toolbar (no card, hairline bottom border) ───────────────────────┐
│ Group by [ Month ▾ ]  [⚙ Filter (2)]                 [7d 14d 30d Month] │
│                                                        From ▾ – To ▾    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technical notes

- Only `src/pages/MyTimelogs.tsx` changes; the wrapper classes copy the toolbar shell from `ProjectTicketsToolbar.tsx` (`sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4 ... bg-background/85 backdrop-blur-md hairline-b`).
- The project filter keeps `MultiSelectFilter` for the popover body; its trigger styling is aligned by passing the same outline/h-8 button treatment, so no new component is introduced.
- No behavioural, data, or state changes.
