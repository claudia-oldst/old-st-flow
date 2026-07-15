## Root cause

The accented S1 chip in the FE Sprint column is driven by `activeByTicket` in `src/features/sprints/usePoolData.ts`. It ignores `sprint_tickets.discipline` and instead derives which discipline column to light up from the **assignee's role** via `memberDisciplines(member.role)`.

For a fullstack dev (Julian), one `sprint_tickets` row with `discipline = 'BE'` therefore contributes to BOTH `fe` and `be` active buckets. Result: DRA-017 has no FE commit in Sprint 1 (the workbench correctly shows it in the FE pool), but the BE-only row still lights up the FE Sprint column as accented S1.

`planned_sprint_fe_id` / `planned_sprint_be_id` are correct and stay untouched.

## Fix

Route the active-bucket by the row's own discipline column.

**File:** `src/features/sprints/usePoolData.ts`

```ts
sprintTickets.forEach((st) => {
  const sprintNum = sprintsById.get(st.sprint_id)?.sprint_number;
  if (!sprintNum) return;
  if (st.discipline !== "FE" && st.discipline !== "BE") return;
  if (!activeByTicket.has(st.ticket_id)) {
    activeByTicket.set(st.ticket_id, { fe: [], be: [] });
  }
  const entry = activeByTicket.get(st.ticket_id)!;
  const bucket = st.discipline === "FE" ? entry.fe : entry.be;
  if (!bucket.includes(sprintNum)) bucket.push(sprintNum);
});
```

Verify `useProjectSprintTickets` (in `useSprintBoard.ts`) already selects `discipline`; add it to the select if it's missing. Drop the now-unused `members` / `memberByUserId` / `memberDisciplines` code paths from this hook.

## Verify

Reload the project tickets list: DRA-017's FE Sprint cell shows the greyed "planned" S1 chip (or "—" if no plan), and only the BE Sprint cell stays accented.

## Out of scope

- No schema/migration changes.
- No changes to `planned_sprint_*_id` handling, `addTicketToLane`, `removeTicketFromSprint`, or assignee cleanup.
- The similar role-based routing in `SprintBlockRow.tsx` / `gantt/useGanttData.ts` is not touched unless a follow-up reports the same symptom there.
