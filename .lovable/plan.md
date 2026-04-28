# Configurable Status Derivation Rules (multi-select) + auto-clear override

PMBAs configure global IF/THEN rules at the platform level. Each rule expresses a flexible condition on FE and BE statuses (multi-select on each side, joined by AND or OR) and assigns a Project status when matched. Rules apply automatically across every project and every ticket.

A manual project-status override sticks **only until the next FE or BE change** — at that point the ticket re-enters the rules engine.

## What you'll see

A new **Status rules** tab in Admin, PMBA-only.

Each rule reads naturally:

```text
Rule 1  IF  FE status IN [Done]                 AND  BE status IN [Done]                 THEN  Project = Released
Rule 2  IF  FE status IN [In progress, Done]    OR   BE status IN [In progress, Done]    THEN  Project = In progress
Rule 3  IF  FE status IN [Todo]                 AND  BE status IN [Todo]                 THEN  Project = Backlog
```

Each rule has:
- **FE status** — multi-select chips (Todo / In progress / Done). Empty = "any FE status".
- **Operator** — AND / OR.
- **BE status** — multi-select chips. Empty = "any BE status".
- **Then Project status** — single select from global statuses.
- **Priority** — drag to reorder; first matching rule wins.

Actions: add rule, delete rule, reorder, "Reset to defaults" (re-seeds the original 3-rule set above).

A live **preview matrix** (3×3 grid of FE × BE) shows which rule wins each cell, so PMBAs can spot gaps or overlaps instantly. Cells with no matching rule are flagged.

## How project status behaves

- **Auto-derive (default):** when a ticket's FE or BE status changes, the engine walks rules in priority order; the first matching rule sets the project status.
- **Manual override:** if a PMBA changes the project status directly on a ticket, that pick is honoured and `project_status_override` is set to true (existing behaviour).
- **Override auto-clears on next FE/BE change:** the very next time someone updates the ticket's FE or BE status, the override flag is reset and the rules engine re-evaluates the project status from the new FE/BE combination. So manual picks are a one-shot snapshot, not a permanent lock.
- A rule with empty FE list matches any FE status (same for BE) — lets you write "IF BE = Done, project = Done" regardless of FE.
- `Proj`-type tickets are skipped (status managed manually, unchanged).
- Saving any rule re-evaluates every eligible ticket (override flag respected at that moment) so the board reflects the new mapping immediately.
- If no rule matches, the ticket's status is left untouched and the matrix shows a warning.

## Technical plan

### Database

```sql
CREATE TABLE public.status_derivation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position int NOT NULL,                                 -- priority, lower = higher
  fe_statuses discipline_status[] NOT NULL DEFAULT '{}', -- empty = any
  be_statuses discipline_status[] NOT NULL DEFAULT '{}', -- empty = any
  operator text NOT NULL CHECK (operator IN ('AND','OR')),
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- RLS readable/writable by all (matches existing public pattern); PMBA gating in UI via `isPMBA`.
- Seed three default rules matching today's hardcoded behaviour.

Rewrite `public.derive_project_status()`:
- Skip if `ticket_type = 'Proj'`.
- **Auto-clear override on FE/BE change:** if `NEW.fe_status IS DISTINCT FROM OLD.fe_status` OR `NEW.be_status IS DISTINCT FROM OLD.be_status`, set `NEW.project_status_override := false` before evaluating rules. (On INSERT, `OLD` is null → treat as a change so override starts false.)
- If `NEW.project_status_override` is still true (i.e. this update didn't touch FE/BE), return NEW unchanged so the manual pick is preserved.
- Otherwise loop `status_derivation_rules` ordered by `position`. For each row:
  - `fe_match = cardinality(fe_statuses) = 0 OR NEW.fe_status = ANY(fe_statuses)`
  - `be_match = cardinality(be_statuses) = 0 OR NEW.be_status = ANY(be_statuses)`
  - Match if `(operator='AND' AND fe_match AND be_match) OR (operator='OR' AND (fe_match OR be_match))`
  - On first match, set `NEW.status_id` and exit.
- If nothing matches, leave `NEW.status_id` unchanged.

`flag_project_status_override()` is unchanged — it still flips the override flag on whenever a PMBA edits `status_id` directly without touching FE/BE.

Add `public.reapply_status_rules()` SECURITY DEFINER — re-runs derivation across all eligible (non-overridden, non-Proj) tickets so saved rule edits propagate immediately.

### Frontend

- New `src/features/admin/StatusRulesAdmin.tsx`:
  - Lists rules with chip-based multi-select for FE and BE, AND/OR toggle, project-status select, drag handle for reordering.
  - "Add rule" / "Delete" / "Reset defaults".
  - Preview 3×3 matrix computed client-side from current rules; flags uncovered cells.
  - On save: upsert/delete rule rows, then `supabase.rpc('reapply_status_rules')`.
  - Realtime subscription on `status_derivation_rules`.
- `src/pages/Admin.tsx`: add PMBA-only "Status rules" tab.

### Files touched
- New migration (table, seed, rewritten trigger function with override-clearing, reapply function).
- New: `src/features/admin/StatusRulesAdmin.tsx`
- Edit: `src/pages/Admin.tsx`

No ticket-component changes needed — derivation and override-clearing flow through the existing trigger.
