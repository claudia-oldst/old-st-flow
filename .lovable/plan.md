# Project tickets don't need a sprint

Sprint commitments only ever apply to frontend and backend work. Project-type tickets should therefore never ask for a sprint.

## Behaviour

- Assigning people to a Project ticket: no sprint pills are shown, and the people list appears straight away — no choice needed before you can pick people or save.
- Bulk assign where every selected ticket is a Project ticket: same — sprint pills hidden, lists shown immediately.
- Bulk assign with a mix of Project and normal tickets: sprint pills stay visible (they apply to the normal tickets only), but the choice is treated as "No sprint" by default so nothing is blocked, and the people lists show immediately.
- Everything else is unchanged: normal tickets still require a sprint or an explicit "No sprint" before the people lists appear.

## Technical notes

- `useSprintChoice` gains a flag (e.g. `skip`/`projectOnly`) that seeds the choice as `"none"` and reports `chosen: true`, so the save gate never blocks.
- `AssignDialog.tsx`: pass the flag when `ticketType === "Proj"`; render `SprintPicker` only when not Proj.
- `BulkAssignDialog.tsx` / `useBulkAssign.ts`: pass the flag when there are no standard tickets in the selection; hide `SprintPicker` in that case, and don't gate the lists on `chosen` for mixed selections.
- `syncSprintCommitments` already ignores Project slots, so no sync-logic change.
- No database, RLS or trigger changes.
