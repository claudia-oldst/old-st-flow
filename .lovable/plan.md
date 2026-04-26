## Code cleanup — safe pass

I'll execute the following items from the review **without changing any user-facing functionality**. Skipping the bigger architectural lifts (React Query migration, file splitting) — those deserve their own dedicated pass.

### Changes

1. **Remove stale `actual_overhead_hours` reference** — `src/features/tickets/useProjectTickets.ts` writes a property that no longer exists on the type or DB column. Delete the line.

2. **Sweep leftover Overhead/Other copy** (no behavior change):
   - `StopGroupTimerDialog.tsx`: drop the unreachable `"Overhead"` fallback label, rename the misleading `isOverhead` alias to `isProject`, fix the obsolete `// null for Overhead` comment.
   - `ProjectTeam.tsx`: change *"'Other' contributor"* copy to *"Project contributor"*.
   - `EstimateEvolution.tsx`: tweak the *"ignore overhead"* comment to *"only FE/BE"*.

3. **Centralize the `ROLES` list** in `src/lib/types.ts` and import everywhere. Fixes the bug where `Admin.tsx` was missing **Design**, while `ProjectTeam.tsx` and `ProjectSettingsDialog.tsx` had it. One source of truth going forward.

4. **Drop stale `as any` casts on `Project`** in `ProjectSettingsDialog.tsx`. The fields (`client_name`, `rate_per_hour`, `start_date`, `links`) all exist on the generated type — the casts are noise from a stale moment in the schema. ~10 casts removed, no behavior change.

5. **Extract `useTicketTimeLogs(ticketId)` hook** to remove the duplicated time-logs fetch in `TicketDetailSheet.tsx` (defined twice with the same select statement). Pure refactor.

6. **Include `actual_project_hours` in `ProjectHealth` totals.** Profitability and overall ratio currently sum FE+BE only, ignoring the new Project bucket. Add it so totals reflect all logged time post-Overhead-removal. (If you'd rather keep totals as FE+BE only, say so and I'll skip this one item.)

### Explicitly **not** doing (deferred / bigger lifts)

- React Query migration of `useProjectTickets`, `useStatuses`, `useProjectRole`, `useProjectEpics` (biggest perf win, but a larger refactor).
- Splitting `ProjectTickets.tsx` (676 lines) and `TicketDetailSheet.tsx` (746 lines) into smaller files.
- Lifting `filterMine` state out of duplication between `ProjectTickets` and `ProjectBoard`.
- Auth hardening (currentUser is just localStorage — needs real auth, not a quick win).

### Risk

Items 1, 2, 4, 5 are pure cleanups with zero behavior change. Item 3 is a one-line addition to one constant + import swaps. Item 6 is the only one that visibly changes a number on the Health page — flag it if you want the old behavior preserved.

I'll TypeScript-check after the changes to make sure nothing broke.
