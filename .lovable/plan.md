# Inline epic rename from the tickets group header

When the tickets list is grouped by Epic, each group header shows the epic name and ticket count. Add a subtle pencil icon next to that name so a PM/BA can rename the epic in place.

## Behaviour
- Pencil appears only when grouping is "Epic", the group is a real epic (not "No epic"), and the user is a PM/BA.
- It sits right after the epic name, faded by default and fully visible on hover of the header row.
- Clicking the pencil (without toggling collapse) swaps the name for a small text input pre-filled with the current name.
- Enter or the check button saves; Escape or the X button cancels. Blur cancels.
- Empty or unchanged names are ignored. Save shows a toast on error and the list refreshes so the new name appears on every ticket row.

## Technical notes
- Add a `renameEpic(id, name)` mutation to `src/features/epics/useProjectEpics.ts` (update `project_epics.epic_name`, then invalidate epics + project tickets queries).
- `TicketsList.tsx`: accept a new optional `canEditEpics?: boolean` prop; extract the group header into a small `TicketsGroupHeader` component under `src/features/tickets/list/` so the edit state stays local per group. The header becomes a `div` with the collapse control as its own button when editing is possible, so the input isn't nested inside a button.
- `ProjectTickets.tsx`: pass `canEditEpics={v.pmba}`; the project id comes from the existing project context used for the epics hook.
- Styling uses existing tokens (`text-dimmer`, `hover:text-foreground`, `hairline`) — no new colors.
