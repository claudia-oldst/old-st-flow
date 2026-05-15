# Responsive layout for wider screens

## Problem
All page shells (and the top bar) are hard-capped at `max-w-[1480px]`. On 1600–2560px monitors this leaves large empty gutters and clips the 5th board column. Cards, columns, dialogs and tables should not stretch — only the page container should breathe so more content (extra board columns, longer table rows, wider charts) fits cleanly.

## Approach
Introduce a single shared "page shell" width rule that grows in steps with the viewport, instead of one fixed cap. Components inside (cards 280px, dialogs, forms, ring charts, etc.) keep their intrinsic widths — they simply get more room to lay out / more columns to show.

Width steps (Tailwind responsive):
- default: `max-w-[1480px]` (current behaviour up to ~1600px)
- `2xl:` (≥1536px): `max-w-[1640px]`
- `min-[1800px]:` `max-w-[1760px]`
- `min-[2000px]:` `max-w-[1920px]`

Horizontal padding also scales: `px-4 sm:px-6 2xl:px-8`.

## Files to change
- `src/components/TopBar.tsx` — apply the new shell classes so the logo / nav / user menu align with page content at every width.
- `src/pages/Projects.tsx`
- `src/pages/ProjectWorkspace.tsx`
- `src/pages/MyWork.tsx`
- `src/pages/Admin.tsx`
- `src/pages/ClientPortalPublic.tsx` — keep its narrower reading width (`1280 → 1440` at 2xl) since it is a public read view, not an app shell.

To avoid drift, define a small helper (or just a constant string) `PAGE_SHELL` in `src/lib/utils.ts` and reuse it in all six files.

## What stays the same
- Board columns stay 280px wide and simply allow more to be visible before horizontal scroll kicks in.
- Ticket cards, dialogs, modals, dropdowns, and form inputs keep their current sizes.
- `TicketsList` table already uses `w-full` inside the shell, so it benefits automatically without any cell stretching changes.
- No changes to mobile / tablet behaviour — the new breakpoints only activate ≥1536px.

## Verification
- Resize preview to 1280, 1440, 1600, 1920, 2200px and confirm:
  - No component visibly stretches.
  - Top bar items align with page content underneath.
  - Board shows progressively more columns without clipping the last one.
  - Lists and health charts gain breathing room without distortion.
