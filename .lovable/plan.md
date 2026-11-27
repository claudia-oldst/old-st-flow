# Sprint Roadmap capacity — easier to read

## The problem
Each developer row repeats the same hours twice (bar label "26.0h/70h" and again "0h committed · 26.0h planned / 70h"), shows zero values, and the FE/BE tag floats far from the name.

## New layout
```text
Sprint 21  28 Nov → 11 Dec      ● Committed  ● Planned
                                FE ████░░░░░  63 / 140h
                                BE ███░░░░░░  44 / 140h
------------------------------------------------------------
(L) Lind     FE  ███▌░░░░░░░░░   26h of 70h   44h free
(R) Regina   FE  ███████░░░░░░   50h of 70h   20h free
(G) Gino     BE  ████░░░░░░░░░   30h of 70h   40h free
(D) Dale     BE  █▌░░░░░░░░░░░   12h of 70h   58h free
```
- One number per row: "used of capacity", then "Xh free" (or coral "Xh over").
- Committed/planned split moves to a small legend in the sprint header and the bar's hover tooltip ("Committed 0h · Planned 26h").
- FE/BE tag sits right after the name as a small pill; the bar gets wider and aligned in one column.
- Whole hours when the decimal is .0-ish isn't changed: values keep current formatting, just shown once.

## Technical details
- `roadmap/SprintCapacityPanel.tsx`: drop the long text line; render discipline pill, wider `ThinCapBar` without its own label, then "of" / free-or-over text.
- `sprint-block/ThinCapBar.tsx`: optional `hideLabel`, richer `title` tooltip; existing callers unchanged.
- Add a Committed/Planned legend next to the sprint header totals.
- Frontend only, no database changes.
