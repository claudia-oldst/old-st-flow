## Problem

Two issues, one plan:

1. Many ticket mutations don't trigger a GitHub sync, so the issue body and labels go stale.
2. Today we emit one `status:` label. You want three distinct labels mirroring this platform's two-tier model, with FE/BE values matching the discipline kanban (To-do, In progress, For integration, Done).

## Label change

Replace the single `status:` label with three:

- `status: <project status name>` — from `statuses.name` via `ticket.status_id` (lowercased)
- `fe status: <human label>` — from `ticket.fe_status` (`todo` → "to-do", `in_progress` → "in progress", `for_integration` → "for integration", `done` → "done")
- `be status: <human label>` — same mapping from `ticket.be_status`

Use the existing `DISCIPLINE_STATUS_LABEL` mapping (in `src/lib/types.ts`) — but inlined in the edge function as a small const map since edge functions can't import from `src/`. All four states are covered (no missing case).

Rules:

- All labels lowercased.
- FE/BE labels **omitted on `Proj` tickets** (no discipline).
- FE label omitted when no FE assignee; same for BE. (Mirrors the detail UI.)
- Each label auto-created on the repo if missing. Colors per prefix: `status:` neutral gray, `fe status:` blue, `be status:` teal. Type and epic colors unchanged.
- Full replacement on each sync, so renaming a project status propagates next sync.

Type and epic labels stay as-is.

## Sync-trigger gaps to close

Add `void syncTicketToGithub(ticketId)` after every ticket mutation that changes anything rendered into the issue (title, AC, type, epic, parent, version, fe_status, be_status, status_id, estimates).

| File | Mutation | Action |
|---|---|---|
| `src/features/tickets/detail/AcceptanceCriteria.tsx` | `acceptance_criteria` | add sync |
| `src/features/tickets/detail/TicketDetailBody.tsx` | `epic_id`, `parent_ticket_id`, `version` (3 sites) | add sync to all |
| `src/features/tickets/BulkActionsBar.tsx` | bulk status / epic / fe_status / be_status / version | loop `selectedIds`, sync each |
| `src/features/tickets/bulk-assign/useBulkAssign.ts` | bulk fe/be reset to `todo` | loop + sync |
| `src/features/board/board/useBoardDnd.ts` | board status change (2 sites) | add sync |
| `src/features/timelog/log-time/useLogTime.ts` | auto status change on timer start | add sync |
| `src/features/tickets/RequestMoreTimeDialog.tsx` | estimate change | add sync |
| `src/features/estimates/ProjectChangeRequests.tsx` | CR approval applies estimate patch | add sync |

Already wired (leave as-is): `QuickAddRow`, `AssignDialog`, `StatusBlock`, `useTicketEditor`.

Add a tiny helper next to `syncTicket.ts` for bulk paths:

```ts
export const syncTicketsToGithub = (ids: string[]) =>
  Promise.all(ids.map(syncTicketToGithub));
```

## Edge function change

`supabase/functions/github-sync-ticket/index.ts`:

- Add inline `DISCIPLINE_LABEL` map (`todo: "to-do"`, `in_progress: "in progress"`, `for_integration: "for integration"`, `done: "done"`).
- Drop the current single `status:` label builder.
- Build the new label list:
  - `type: …`
  - `epic: …` (if epic)
  - `status: <project status name>` (if status_id resolved)
  - `fe status: <fe label>` (skip if `Proj` or no FE assignee)
  - `be status: <be label>` (skip if `Proj` or no BE assignee)
- Extend `ensureLabel` color map: `fe status:` blue, `be status:` teal.

(We already fetch `fe_status`, `be_status`, status name, and assignees with slot — no new queries.)

## Out of scope

No Postgres trigger / pg_net based sync (would be more bulletproof for future code paths but needs a service-role auth path in the edge function). Happy to follow up.

## Verification

- Change project status in detail sheet → `status:` label updates, FE/BE labels unchanged.
- Set FE to "For integration" → `fe status: for integration` label appears; BE untouched.
- Bulk-select 3 tickets, change BE status → all 3 issues get updated `be status:` label.
- Edit acceptance criteria → issue body updates within ~1s.
- Open a `Proj` ticket → only `status:` label, no `fe status:` / `be status:`.
