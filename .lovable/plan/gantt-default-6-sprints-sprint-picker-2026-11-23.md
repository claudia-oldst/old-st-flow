# Gantt: default 6 sprints + sprint picker

## What changes
- The Sprints > Gantt chart opens showing 6 sprints: the 4 before the current sprint, the current sprint (5th), and the next one.
- If there's no next sprint yet, it shows the 6 latest sprints up to the current one. If there's no active sprint, it uses the sprint closest to today.
- A "Sprints" multi-select dropdown (the same one used on Health, Change Requests, billing etc.) sits in the Gantt toolbar next to the FE/BE/ALL toggle. Tick or untick any sprints to show; "Reset" goes back to the default 6.
- The chart columns and bars only cover the selected sprints. The Export PNG exports what's shown.
- The client portal timeline uses the same chart, so it gets the same default and dropdown.

## Technical details
- New pure helper `defaultGanttSprintIds(sprints, today)` in `src/features/sprints/gantt/` with a small test (current = 5th, fallbacks above).
- `SprintGantt.tsx` holds the selected sprint ids, renders `MultiSelectFilter` from `src/features/_shared/`, and passes the filtered sprint list to `useGanttData` and `GanttGrid`.
- Frontend only: no database changes, no Slack messages.
