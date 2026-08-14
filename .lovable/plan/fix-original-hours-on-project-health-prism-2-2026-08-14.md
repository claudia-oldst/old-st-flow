# Fix "Original" hours on Project Health (Prism 2)

## What is showing today

The Health rings label "Original" is **not** the sum of `original_fe_estimate` / `original_be_estimate` / `original_project_estimate`. It only counts tickets that were created on or before the project's start date; everything created later contributes 0 to Original (but still contributes to Estimate and Actual).

Confirmed against Project Prism 2 (PRI):

- Project start date: 2026-07-24. 146 tickets total, only 10 created on/before that date.
- Sum of original estimates across **all** tickets: FE 537h, BE 126h, Project 62h.
- Sum restricted to the 10 pre-start tickets: FE 42h, BE 2h — exactly the "Original 42h / 2h" in the screenshot.
- Current estimates: FE 537h, BE 126h — which is why "Estimate" reads 537h/126h.

So the Original ring value and the "% of original" figure are both understated for any project whose tickets were created after its start date.

## The change

Drop the start-date gate in the Health totals: Original becomes the plain sum of `original_fe_estimate`, `original_be_estimate` and `original_project_estimate` over the tickets currently in scope (respecting the active Version filter, exactly like Estimate and Actual already do).

Expected result for Prism 2: Frontend Original 537h, Backend Original 126h, Project Original 62h, and the Profitability card's "Original" total and "% of original" recompute off those.

## Technical notes

- File: `src/features/health/ProjectHealth.tsx`, the `totals` memo (~lines 71-104). Remove the `startMs` / `inOriginal` condition and always accumulate the three `original_*` fields.
- The `projectStart` query becomes unused for totals; leave the query only if another consumer needs it, otherwise remove it along with the now-dead date parsing.
- No database changes. Epic Risk table, Estimate Evolution and the client portal use their own baseline logic and are out of scope for this fix.
