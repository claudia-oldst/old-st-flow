# Sprints — Workbench

**Sub-tab of `/projects/:id/sprints`.**

The execution view for the currently active sprint. Focused on "what's in flight right now", not planning.

## Top bar
- Active sprint name and date range.
- Day-by-day progress strip (one block per working day) showing burn vs. ideal.
- **Forecasting calendar** toggle that swaps the body for a calendar-style projection.

## Body (default)
- Grouped by developer.
- Each group: avatar + name, "done h / committed h", and the developer's ticket cards laid out in lanes (FE / BE / Project).
- Each card shows discipline status, hours logged today, and a quick "Log time" icon button.

## Interactions
- Clicking a card opens the Ticket Detail sheet.
- The quick "Log time" button opens the Log Time modal pre-targeted at the card's ticket and discipline.
- Status changes made elsewhere (board, sheet) update cards in place.

## Forecasting calendar (toggled)
- Week view with sprint days highlighted.
- Each day shows projected vs. logged hours per developer; over-capacity days are highlighted coral.
- Helps PMBA spot likely overruns mid-sprint.
