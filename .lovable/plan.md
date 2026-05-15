# Daily Logoff Summary

Add a small calendar icon next to the user picker in the top bar. Clicking it opens a modal that shows an AI-generated, editable end-of-day summary of the work the current user logged time against today, grouped by project, ready to copy.

## UX

- **TopBar**: new ghost icon button (`Calendar` from lucide-react) immediately to the left of the `UserPicker`. Tooltip: "Logging off summary". Disabled when no current user.
- **Modal** (`LogoffSummaryDialog`): opens on click.
  - Header: "Logging off — {today, e.g. Fri 15 May}"
  - Body: a single `Textarea` (auto-sized, ~14 rows) prefilled with the AI-generated copy. User can freely edit.
  - Empty state: "No time logged today yet." with a subtle illustration and a Close button.
  - Loading state: skeleton lines + "Drafting your summary…"
  - Error state: inline message + Retry button.
  - Footer: `Regenerate` (ghost, left) and `Copy` (primary, right, `Copy` icon → switches to `Check` for 1.5s on success). `Esc` / overlay click closes.

## Generated copy shape

```text
Logging off:
- {Project name}: {1–2 sentence summary across that project's tickets}
- {Project name}: {…}
Good night!
```

- One bullet per project the user logged against today.
- Each summary is **5–8 words, terse dev shorthand** (e.g. "fixed timer race, polished portal totals"). No full sentences, no punctuation flourish, no emojis.
- Audience: the wider dev team standup-style — not clients, not PMs.
- Grounded in: ticket title, formatted_id, hours logged, and time-log notes from today. Skip projects with 0 hours.

## Data flow

1. On open, client queries `time_logs` for `user_id = current user` and `logged_at` between today 00:00 and 24:00 (local tz, sent as ISO range), joining `tickets(id, formatted_id, title, project_id, projects(name))`.
2. Group rows by `project_id` → `{ projectName, tickets: [{ formatted_id, title, hours, notes[] }] }`.
3. POST that compact JSON payload to a new edge function `daily-logoff-summary`. The function calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a system prompt that enforces the exact output shape above and returns `{ summary: string }`.
4. Client puts `summary` into the textarea. `Regenerate` re-calls the function. `Copy` writes the textarea's current value to the clipboard via `navigator.clipboard.writeText`.

## Technical details

- New files:
  - `src/features/logoff/LogoffSummaryButton.tsx` — icon + dialog state.
  - `src/features/logoff/LogoffSummaryDialog.tsx` — modal UI, textarea, copy/regenerate.
  - `src/features/logoff/useDailyLoggedWork.ts` — fetches today's logs grouped by project (React Query, enabled only when dialog open).
  - `src/features/logoff/useGenerateLogoffSummary.ts` — wraps `supabase.functions.invoke('daily-logoff-summary', …)`.
  - `supabase/functions/daily-logoff-summary/index.ts` — CORS, validate body with Zod, call Lovable AI Gateway (non-streaming), return `{ summary }`. Surfaces 429/402 as user-facing errors.
- `TopBar.tsx`: import and render `<LogoffSummaryButton />` just before `<UserPicker />` in the right-aligned cluster. Uses existing `useCurrentUser` to know who to query.
- AI Gateway: requires `LOVABLE_API_KEY` (already provisioned via Lovable Cloud — verify with `fetch_secrets`, enable if missing).
- No DB schema changes. No new RLS work — `time_logs`, `tickets`, `projects` are already readable.
- "Today" is computed in the user's local timezone on the client and sent as an explicit start/end ISO range so the edge function stays timezone-agnostic.
- Toasts: success on copy ("Copied to clipboard"), error toasts for fetch / AI failures.

## Out of scope

- Persisting the summary anywhere.
- Sending to Slack/email.
- Multi-day ranges or per-project filtering.
