# Add zod + ErrorBoundary + tighten `any`

Three independent quality passes. No behavioural changes; UI/UX and Supabase calls stay identical.

## 1. ErrorBoundary

Add a global error boundary plus route-level fallbacks so a crash in one feature doesn't blank the whole app.

- New `src/components/ErrorBoundary.tsx` — class component with themed fallback (`bg-surface-2`, `text-foreground`, coral CTA), shows error message in dev only, "Reload" button always.
- Wrap `<App />` in `src/main.tsx` (top-level catch).
- Wrap each routed page in `src/App.tsx` so navigation away from a broken page works without full reload.
- One RTL test: child throws → fallback + Reload button render.

## 2. Zod schemas on user input

Validate every place a user types free-form data that's persisted. Skip internal toggles/selects (already constrained by UI).

New schemas in `src/lib/schemas/`:

| File | Used by | Fields |
|---|---|---|
| `comment.ts` | `CommentComposer`, `CommentItem` edit | `body` 1–5000 trimmed; `attachments` array max 10 |
| `ticket.ts` | `QuickAddRow`, `add-dialog/useDraftRows`, `TicketDetailSheet` | `title` 1–200, `description` ≤10_000, `estimate_hours` 0–9999, `version` ≤50 |
| `project.ts` | `ProjectSettingsDialog`, `ProjectLinksEditor` | `name` 1–120, `client_name` ≤120, link `{label ≤60, url: z.string().url()}` |
| `csvImport.ts` | `useTicketsCsvImport` | reuses `ticket.ts` row schema |
| `clientPortal.ts` | `EpicSummaryEditor` | `summary` ≤5000 |

Pattern at each call site:
```ts
const parsed = ticketSchema.safeParse(input);
if (!parsed.success) {
  toast.error(parsed.error.issues[0].message);
  return;
}
```

Tests: one spec per schema (happy path + boundary + rejection) ≈ 5 files / ~20 assertions.

## 3. Tighten `any`

Current count ~75 across ~30 files. Plan targets ~50 high-value, low-risk wins; leaves recharts `formatter={(v: any)=>...}` and one supabase realtime overload cast.

- New `src/types/domain.ts` re-exports row types from generated `Database`: `TicketRow`, `EstimateChangeRow`, `ProjectMemberRow`, `CommentRow`, `EpicRow`, `ProjectRow`, `TeamMemberRow`.
- Replace `as any` casts in:
  - `useEstimateChanges`, `useAllEstimateChanges` → `EstimateChangeRow[]`
  - `useProjectTickets(Paged)`, `useTicketsCsvImport` → `TicketRow`
  - `useTicketComments`, `CommentItem/Thread/Composer`, `TicketComments` → `CommentRow` + `Attachment[]`
  - `ProjectTeam`, `ProjectSettingsDialog`, `ProjectHealth`, `AssignDialog`, `BulkAssignDialog` → `ProjectMemberRow & { member: TeamMemberRow }`
  - `useArchiveProject`, `useRehydrateProject` → `{ url?: string; error?: string }`
  - `MyWork.tsx` → typed timer + ticket rows
  - `ProjectTicketsToolbar.cardPrefs: any` → existing `CardPrefs` type
  - `ExportProjectDialog` (5) + `catch (err: any)` → `unknown` with `instanceof Error`
  - `StatusRulesAdmin` (10) → existing `Rule` interface
- Anything remaining gets `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line reason.

## Acceptance

- `tsc --noEmit` clean; `vitest run` green (existing 43 + ~6 new).
- `rg ": any\b|<any>|as any\b"` returns ≤ 15 hits, each justified.
- Throwing inside any routed page renders fallback instead of white screen.
- Empty comment / over-long ticket title shows toast and does not hit Supabase.

## Out of scope

Auth, RLS, edge-function hardening, react-hook-form migration, server-side validation.
