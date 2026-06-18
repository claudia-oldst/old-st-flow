## Problem

When you try to assign COUT-012 to Lind for Sprint 2, the toast says "[object Object]" instead of the real reason. That means the actual DB error is being swallowed — we can't yet tell *why* the assign failed, only that the error reporting is broken.

### Why this happens

`SprintWorkbench.assignToDev` (and a few sibling handlers — `moveToSprint`, `removeFromSprint`, `clearFromSprint`) catch errors with:

```ts
toast.error(err instanceof Error ? err.message : String(err));
```

Supabase throws **PostgrestError-shaped plain objects** (`{ message, details, hint, code }`), which are *not* `Error` instances. `String(err)` on a plain object yields `"[object Object]"`. Same pattern exists in `CarryoverReviewPanel` and a few other places that call `addTicketToLane`.

I checked the DB state for COUT-012 / Sprint 2 / Lind and nothing obvious blocks the insert (no existing `sprint_tickets` row, Lind is a Frontend project member, no `Proj` type, unique `(sprint_id, ticket_id)` is free). The real error is being hidden behind the bad formatter, so step one is to surface it.

## Plan

### 1. Add a small error-formatting helper

New file `src/lib/formatSupabaseError.ts`:

- Accept `unknown`.
- If `Error` → return `.message`.
- If object with string `message` → return `message`, append `(code)` when `code` exists, and append `hint`/`details` on a second line when present.
- Otherwise `JSON.stringify` (fallback) with a guard against circular refs, finally `String(err)`.
- Always `console.error("[supabase]", err)` so the raw object is visible in devtools.

### 2. Use the helper everywhere errors from Supabase are toasted in the sprint flow

Replace the `err instanceof Error ? err.message : String(err)` pattern in:

- `src/features/sprints/SprintWorkbench.tsx` — `assignToDev`, `moveToSprint`, `clearFromSprint`, `removeFromSprint` (4 call sites).
- `src/features/sprints/dnd.ts` — the `toast.error(\`Could not assign ${slot}: ${aerr.message}\`)` line: keep the prefix, but use the helper for the body so `hint`/`code` come through.
- `src/features/sprints/CarryoverReviewPanel.tsx` — any `toast.error` in the addTicketToLane loop (same shape).

No other behaviour changes.

### 3. Verify

- `tsc --noEmit`.
- Ask the user to retry the COUT-012 → Lind / Sprint 2 assignment. The toast will now show the real Postgres error (message + code + hint), and the raw error will be in the browser console. From that we can decide the real fix (likely a policy or trigger issue) in a follow-up.

## Scope / non-goals

- No DB migrations.
- No change to the assign logic itself yet — first we need the real error message. Once you share what the new toast says, I'll fix the underlying cause as a separate small change.
- No change to unrelated error toasts outside the sprint flow.
