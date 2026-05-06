## Ticket Discussion — Chat Feature

Add a full chat/comment thread to the **Discussion** tab in `TicketDetailSheet`, sitting below the existing Acceptance Criteria block. ClickUp-style: top-level comments, one level of replies, attachments (images/videos/files), edit/delete own comments, realtime updates.

### 1. Database (migration)

New table `ticket_comments`:
- `id uuid pk default gen_random_uuid()`
- `ticket_id uuid not null` (indexed)
- `user_id uuid not null` — references `team_members.id` (consistent with rest of app, which uses the in-app `currentUser` store, not `auth.users`)
- `parent_id uuid null` — references `ticket_comments.id` on delete cascade. **Constraint: a row whose `parent_id` is not null must point to a row whose `parent_id` is null** (enforces single reply level) — implemented via `BEFORE INSERT/UPDATE` trigger.
- `body text not null default ''`
- `attachments jsonb not null default '[]'` — array of `{ url, path, name, mime, size, kind: 'image'|'video'|'file' }`
- `edited_at timestamptz null`
- `created_at timestamptz not null default now()`
- Indexes on `(ticket_id, created_at)` and `(parent_id)`.
- RLS: enabled, public read/insert/update/delete (matches existing app-wide policies).

New storage bucket `ticket-attachments` (public read) with permissive insert/update/delete policies (matches the rest of the project's open-access posture).

### 2. Frontend

New folder `src/features/comments/`:

- **`useTicketComments.ts`** — fetches comments + author `team_members` join for a ticket, groups replies under parents, exposes `reload`, subscribes to realtime via `useRealtimeReload` on `ticket_comments` filtered by `ticket_id`.
- **`uploadCommentAttachment.ts`** — uploads a `File` to `ticket-attachments/{ticketId}/{uuid}-{name}`, returns the metadata object stored in `attachments`. Detects `kind` from MIME (`image/*`, `video/*`, else `file`).
- **`CommentComposer.tsx`** — textarea + paperclip button (multi-file), drag-and-drop zone, attachment chips with remove + upload progress, Cmd/Ctrl+Enter to send. Used for both new top-level comments and replies (compact variant for replies). Disabled when no current user.
- **`CommentItem.tsx`** — renders avatar (`MemberAvatar`), author name, relative time, edited badge, body (markdown via existing `ReactMarkdown` + `remarkGfm`), attachment grid (inline `<img>`/`<video controls>` previews; generic file chip with download link for others), and action row: **Reply**, **Edit** (own only), **Delete** (own + PMBA). Inline edit mode reuses `CommentComposer`.
- **`CommentThread.tsx`** — renders a parent `CommentItem`, its replies indented with a left border, and an inline reply composer toggled by the Reply button.
- **`TicketComments.tsx`** — top-level container: header "Discussion (N)", new-comment composer, then list of threads sorted oldest-first. Empty state "Start the conversation".

### 3. Wiring into the sheet

In `src/features/tickets/TicketDetailSheet.tsx`, the Discussion `TabsContent` becomes:
```
<AcceptanceCriteria … />
<div className="hairline-t pt-6 mt-6">
  <TicketComments ticketId={ticket.id} />
</div>
```

### Technical details

- Auth model: uses the existing `useCurrentUser` zustand store (same as `LogTimeModal`, timers, etc.). A user must be selected in the TopBar switcher to post — composer shows a hint otherwise. No Supabase Auth changes.
- Permissions:
  - View: anyone.
  - Post / reply / upload: any selected user.
  - Edit: only the author.
  - Delete: author or PMBA (`isPMBA(useProjectRole(projectId))`).
- Reply depth enforced both in UI (no Reply button on replies) and in DB trigger.
- Attachments: max 25 MB per file, max 10 per comment, validated client-side. Image/video render inline; others show as a download chip with filename + size.
- Realtime: `useRealtimeReload([{ table: 'ticket_comments', filter: 'ticket_id=eq.<id>' }], reload)`.
- Styling: matches existing surface tokens (`bg-white/[0.02] hairline rounded-lg p-3`), Inter body, coral primary for Send.
- Delete is hard-delete with cascade on replies; confirm via `window.confirm`.

### Files

Created:
- `supabase/migrations/<ts>_ticket_comments.sql`
- `src/features/comments/useTicketComments.ts`
- `src/features/comments/uploadCommentAttachment.ts`
- `src/features/comments/CommentComposer.tsx`
- `src/features/comments/CommentItem.tsx`
- `src/features/comments/CommentThread.tsx`
- `src/features/comments/TicketComments.tsx`

Edited:
- `src/features/tickets/TicketDetailSheet.tsx` — mount `TicketComments` under acceptance criteria in the Discussion tab.
