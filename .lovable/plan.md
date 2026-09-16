# Distinct lifecycle pill colours

Give each of the nine lifecycle statuses its own distinct, semantically sensible colour. Currently Pre-live and Confirmed share neutral grey, and Bug-Fixing and On Hold share amber — they're not distinguishable at a glance.

## New colour per status

| Status | Colour | Why |
| --- | --- | --- |
| Pre-live | slate (neutral grey) | not yet live, inert |
| Confirmed | sky (teal-blue) | booked in, optimistic |
| Definition | blue | planning / definition |
| In Progress | coral / primary | active work — the brand CTA |
| Bug-Fixing | orange | fixing, warm warning |
| Monitor | gold / accent | watching, golden |
| Completed | emerald / green | done |
| On Hold | violet | paused, distinct from amber |
| Closed Lost | red / health-bad | lost |

All nine now differ from one another and read in a sensible order (neutral → sky → blue → coral → orange → gold → green → violet → red).

## Change

Only `src/features/project/settings/lifecycle.ts` — update `LIFECYCLE_PILL` (background/text/ring classes) and `LIFECYCLE_DOT` (dot colour) so each status maps to its new colour above. No other files change; the pill and dropdown already consume these maps.

Colours reuse the existing tailwind palette already used by these maps (blue/amber already present; add sky, orange, emerald, violet, slate, red) plus the brand tokens (primary coral, accent gold, health-good, health-bad) already in `index.css`.
