## Goal

Let developers request additional time per ticket, log every estimate change as an audit trail, and add an Epic-level estimate-evolution chart in the Health section that can be filtered by date so PMBAs can see how estimates vs actuals evolved compared to the original baseline.

The legacy `est_frontend_hours` / `est_backend_hours` columns are fully replaced by `original_*_estimate` (immutable baseline) + `current_*_estimate` (live, mutable).

## Database changes (migration)

**1. Tickets — add baseline + current estimate columns, drop legacy**

```sql
ALTER TABLE public.tickets
  ADD COLUMN original_fe_estimate numeric NOT NULL DEFAULT 0,
  ADD COLUMN original_be_estimate numeric NOT NULL DEFAULT 0,
  ADD COLUMN current_fe_estimate  numeric NOT NULL DEFAULT 0,
  ADD COLUMN current_be_estimate  numeric NOT NULL DEFAULT 0;

-- Backfill from existing values
UPDATE public.tickets
   SET original_fe_estimate = est_frontend_hours,
       current_fe_estimate  = est_frontend_hours,
       original_be_estimate = est_backend_hours,
       current_be_estimate  = est_backend_hours;

ALTER TABLE public.tickets
  DROP COLUMN est_frontend_hours,
  DROP COLUMN est_backend_hours;
```

**2. New table `ticket_estimate_changes` (audit log)**

```sql
CREATE TABLE public.ticket_estimate_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,             -- requester
  discipline assignee_slot NOT NULL, -- 'FE' | 'BE'
  previous_hours numeric NOT NULL,
  new_hours numeric NOT NULL,
  delta numeric GENERATED ALWAYS AS (new_hours - previous_hours) STORED,
  reason text,
  status text NOT NULL DEFAULT 'approved', -- 'approved' | 'pending' | 'rejected'
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_estimate_changes ENABLE ROW LEVEL SECURITY;
-- Public read/insert/update policies (matches existing project pattern)
```

**3. Seed initial baseline change rows** (optional but useful for the trend chart) — one row per existing ticket with `previous_hours = 0`, `new_hours = original_*_estimate`, `created_at = ticket.created_at`, so the time-series has a starting point.

## Code refactor: replace `est_*_hours` everywhere

Every reference becomes `current_*_estimate` (since that's what burn/health and "what is this ticket estimated at right now" should reflect). The original is shown alongside only where useful (ticket detail).

Files to edit:

- `src/features/tickets/useProjectTickets.ts` — `TicketRow` gets `original_fe_estimate`, `original_be_estimate`, `current_fe_estimate`, `current_be_estimate`. Drop `est_*_hours`.
- `src/features/tickets/TicketCard.tsx` — read `current_*_estimate` for the FE/BE bars.
- `src/features/tickets/TicketsList.tsx` — show `current_*_estimate` in columns.
- `src/features/tickets/TicketDetailSheet.tsx` — show current as headline; show "originally Xh" in muted text when `current ≠ original`. Edit form writes both `original_*_estimate` and `current_*_estimate` on initial PMBA edit only when... see "Edit semantics" below.
- `src/features/tickets/QuickAddRow.tsx` — insert sets both `original_*_estimate` and `current_*_estimate` to the entered value.
- `src/features/tickets/ProjectTickets.tsx` (CSV/import path at line 192–193) — same: write to both original and current.
- `src/features/health/ProjectHealth.tsx` — burn rings sum `current_*_estimate`.
- `src/pages/MyWork.tsx` — select + display `current_*_estimate`.

**Edit semantics for PMBA "Edit estimates" in TicketDetailSheet:**
- Editing updates `current_*_estimate` only and writes a `ticket_estimate_changes` row with `status='approved'`, `user_id = current user`, `reason = 'PMBA edit'` (or whatever they typed). Original stays locked after creation.

## Dev-facing UI: request more time

In `TicketDetailSheet.tsx`, "Estimates & actuals" block:

- Headline shows `current_*_estimate`. Underneath in muted text: "originally {original}h" when they differ.
- New **"Request more time"** button visible to:
  - Devs assigned to FE slot (FE only), assigned to BE (BE only)
  - PMBAs (either)
- Opens new `RequestMoreTimeDialog`: discipline (locked for devs, picker for PMBA), additional hours (number, can be negative for PMBA), reason (textarea, required).
- Submit:
  1. Insert `ticket_estimate_changes` (`previous_hours = current`, `new_hours = current + additional`, `status='approved'`).
  2. Update ticket `current_*_estimate`.
- Below the estimate, show last 3 change-log entries ("+4h FE — Kyle, 12 Apr — 'API scope grew'") with "View all" expanding the full list.

## Epic-level estimate analytics in Health

New component `EstimateEvolution.tsx` rendered at the bottom of `ProjectHealth.tsx`:

- **"As of" date picker** at the top, defaults to today.
- For the chosen date, computes per epic (and "No epic" bucket), only including tickets where `created_at <= asOf`:
  - **Original**: sum `original_fe_estimate + original_be_estimate`.
  - **Estimate as of date**: original + sum of approved `ticket_estimate_changes.delta` where `created_at <= asOf`.
  - **Actuals as of date**: sum `time_logs.hours` (FE+BE, excluding overhead) where `logged_at <= asOf`.
- Renders horizontal bar group per epic: three bars (Original / Current estimate / Actual) plus delta chips ("+6h scope", "92% burned").
- Below that, a **trend chart** (Recharts `LineChart`) for a selected epic (dropdown, defaults to "All epics aggregated"): three lines — Original, Current Estimate, Actual — sampled daily from project's first ticket `created_at` up to the "as of" date.

Visible to all roles read-only.

## New files

- `src/features/tickets/RequestMoreTimeDialog.tsx`
- `src/features/estimates/useEstimateChanges.ts` — fetch + realtime subscription for `ticket_estimate_changes` filtered by project (joined via tickets).
- `src/features/health/EstimateEvolution.tsx` — date picker, per-epic bars, trend chart.

## Technical notes

- Recharts already wired via `src/components/ui/chart.tsx`.
- After dropping the legacy columns, `src/integrations/supabase/types.ts` is regenerated automatically — do not hand-edit.
- Trend chart computes daily buckets client-side: cheap at project scale.
- `assignee_slot` enum already exists, reused for `discipline` on the audit table.

## Open questions

1. **Approval workflow** — Auto-apply dev requests (current plan) or require PMBA approval before `current_*_estimate` changes?
2. **Date filter** — Single "as of" date (current plan), or a date *range* with start + end?
3. **Negative adjustments** — Allow devs to request *less* time, or only PMBAs can reduce?
