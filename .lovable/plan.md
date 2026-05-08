## Goal

Promote the QA role to near-PMBA permissions everywhere, except the three things QAs must never do:

1. Approve / reject **Change Requests** (CR tickets)
2. Approve / reject **Estimate Revisions**
3. Edit **project information** (settings, client portal, archive/restore)

QAs gain: ticket creation, CSV import, list-view bulk actions (status / assignee / version / epic / estimate / delete), inline editing on the ticket detail sheet, project-status override, and ticket deletion — same surface PMBA gets today.

## Approach

Today every PM/BA gate calls `isPMBA(role)` from `src/features/team/useProjectRole.ts`. We introduce a second helper in the same file and route each call site to the helper that matches the action.

```text
useProjectRole.ts
├── isPMBA(role)            → role === "PMBA"          (unchanged)
└── canManageTickets(role)  → role === "PMBA" || "QA"   (NEW)
```

Two clean buckets — no per-component role checks scattered around.

## Changes by file

**`src/features/team/useProjectRole.ts`**
- Add `canManageTickets(role)` returning `true` for `PMBA` and `QA`.

**Switch from `isPMBA` → `canManageTickets`** (QA gains access):
- `src/features/tickets/project-tickets/ProjectTicketsToolbar.tsx` — Add ticket button + CSV import dropdown.
- `src/features/tickets/project-tickets/useProjectTicketsView.ts` — `pmba` flag (used to power `BulkActionsBar` `canEdit` and default filter behavior). Rename internal var to `canManage` for clarity; consumers (`ProjectTickets.tsx` line 150 `canEdit={v.pmba}`) follow.
- `src/features/tickets/TicketDetailSheet.tsx` — `isPMBARole` (controls inline title/epic/version editing, status override, assignee edits, estimate edits, delete button) becomes `canManage`. The three downstream props (`isPMBARole` on `StatusBlock`, `EstimatesPanel`) get renamed accordingly.
- `src/features/tickets/detail/StatusBlock.tsx` — rename prop, no logic change.
- `src/features/tickets/detail/EstimatesPanel.tsx` — rename prop, no logic change. (This edits *current* estimates inline; it does not approve revisions.)
- `src/features/board/ProjectBoard.tsx` — `pmba` (controls default board mode, "All vs Mine" default, and `canQuickAdd`). Rename to `canManage`.
- `src/features/comments/CommentItem.tsx` — `canDelete` includes QA (moderation parity).

**Stay PMBA-only** (QA explicitly excluded):
- `src/features/estimates/ProjectChangeRequests.tsx` — `canReview` (estimate revision approval).
- `src/features/change-requests/ProjectChangeRequestTickets.tsx` — `canReview` (CR approval).
- `src/pages/ProjectWorkspace.tsx` — `canEdit` controls: "Estimate Revisions" tab visibility, "Client" tab visibility, project export button, `ProjectSettingsDialog` edit mode. All remain PMBA-only.
- `src/features/client-portal/ClientPortalEditor.tsx` — `canEdit` (publishing client summaries).
- `src/features/vault/VaultDashboard.tsx` — `canRestore` (project archive/restore).
- `src/features/team/ProjectTeam.tsx` — project membership management.
- `src/pages/Admin.tsx` — global Status Rules admin.

## Database

No migration required. The `assignee_slot` enum and `validate_ticket_assignee` trigger already accept QA via the `Project` slot. QA-as-a-discipline (separate `qa_status`) is a future change and not part of this scope.

## Out of scope

- Adding a dedicated QA discipline status (`qa_status` column, QA assignee slot, QA estimate fields).
- Any change to how project status is derived.
- Any change to RLS policies (current policies are permissive: `using (true)`; gating is enforced in the UI, consistent with the rest of the app).

## QA / verification

After implementation, log in as a QA project member and confirm:
- Tickets list: bulk select → status / assignee / version / epic / estimate / delete all work; "Add ticket" + "Import CSV" visible.
- Ticket detail sheet: inline title/epic/version/estimate edits work; can override project status; delete works.
- Estimate Revisions and Change Requests tabs: approve/reject buttons hidden; only PMBA sees them.
- Project header: settings, export, Client tab all hidden / read-only.
- Vault: restore action hidden.
