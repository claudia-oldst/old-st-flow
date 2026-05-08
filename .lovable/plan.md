## Goal
Refactor the 5 largest non-generated files into smaller, focused modules following the existing `useFoo` + presentational-component pattern, then add ~30 unit tests covering the extracted pure logic and key UI behaviour.

No behavioural changes. Same imports for callers (the top-level component keeps its current name and export path).

---

## Part A — File splits

### 1. `src/features/client-portal/ClientPortalEditor.tsx` (577 LOC)
Currently holds: `makeHash()`, `ClientPortalEditor`, `EpicSummaryEditor`, `PreviewChangeRequests`.

Split into:
```text
client-portal/
  ClientPortalEditor.tsx         (shell + tabs only, ~180 LOC)
  editor/
    EpicSummaryEditor.tsx        (extracted)
    PreviewChangeRequests.tsx    (extracted)
    PortalHashControls.tsx       (hash gen / copy / regenerate row)
    PortalSummaryForm.tsx        (draft / publish summary block)
    useClientPortalEditor.ts     (load + save + publish + hash mutations)
  utils/
    makeHash.ts                  (pure — easy to unit test)
```

### 2. `src/features/project/ProjectSettingsDialog.tsx` (421 LOC)
```text
project/
  ProjectSettingsDialog.tsx      (dialog shell + tabs, ~140 LOC)
  settings/
    GeneralFieldsForm.tsx        (name, acronym, client, rate, dates)
    ProjectLinksEditor.tsx       (links list + add/remove)
    DangerZone.tsx               (archive / delete buttons)
    useProjectSettingsForm.ts    (state + validation + save)
  types.ts                       (move ProjectLink here)
```

### 3. `src/features/estimates/EpicChangeCard.tsx` (420 LOC)
```text
estimates/
  EpicChangeCard.tsx             (container, ~150 LOC)
  epic-change/
    EpicChangeHeader.tsx         (title + totals)
    EpicChangeTicketRow.tsx      (per-ticket row with status + delta)
    EpicChangeActions.tsx        (approve / reject / request more)
    Stat.tsx                     (shared, see below)
    StatusBadge.tsx              (shared, see below)
    useEpicChange.ts             (derive deltas, group rows)
```

### 4. `src/features/change-requests/EpicCRCard.tsx` (399 LOC)
Mirrors #3 — share helpers.
```text
change-requests/
  EpicCRCard.tsx                 (container)
  epic-cr/
    EpicCRHeader.tsx
    EpicCRTicketRow.tsx
    EpicCRActions.tsx
    useEpicCR.ts                 (crEstimate + grouping)
```

`Stat` and `StatusBadge` exist in both #3 and #4 with identical shape — extract once to a shared module:
```text
src/features/_shared/estimate-ui/
  Stat.tsx
  StatusBadge.tsx
```

### 5. `src/features/admin/StatusRulesAdmin.tsx` (417 LOC)
```text
admin/
  StatusRulesAdmin.tsx           (page shell, ~120 LOC)
  status-rules/
    RuleRow.tsx                  (single rule editor)
    RuleSimulator.tsx            (FE/BE picker + result preview)
    ChipGroup.tsx                (extracted)
    useStatusRules.ts            (CRUD + reorder + reapply)
    evaluateRule.ts              (pure — already a function, just move it)
```

---

## Part B — Tests (~30)

Vitest + Testing Library are already configured (`src/test/setup.ts`, `vitest.config.ts`). New tests live next to the code they cover.

### Pure-function tests (fast, no DOM) — 18
1. `utils/makeHash.test.ts` — length, alphabet, uniqueness across 1k calls *(3)*
2. `status-rules/evaluateRule.test.ts` — AND match, OR match, empty arrays act as wildcard, no-match returns null, first-rule-wins ordering, operator switch *(6)*
3. `epic-change/useEpicChange.test.ts` (or pure helpers extracted from it) — delta sign, zero-delta filtered out, grouping by epic, totals across mixed disciplines *(4)*
4. `epic-cr/useEpicCR.test.ts` — `crEstimate` adds FE+BE+Project, ignores nulls; pending vs approved partitioning *(3)*
5. `useProjectSettingsForm.test.ts` — rate must be ≥ 0, acronym uppercased + trimmed, links: reject malformed URL, accept https/http *(2 grouped)*

### Component / hook tests with RTL — 12
6. `Stat.test.tsx` — renders label + formatted number, applies positive/negative class on delta *(2)*
7. `StatusBadge.test.tsx` — maps each status → expected token class, falls back on unknown *(2)*
8. `ChipGroup.test.tsx` — toggles selection on click, multi-select, calls onChange with new array *(2)*
9. `ProjectLinksEditor.test.tsx` — add row, remove row, edits propagate via onChange *(2)*
10. `RuleRow.test.tsx` — editing operator updates state; reorder buttons disabled at boundaries *(2)*
11. `PortalHashControls.test.tsx` — clicking "Regenerate" calls hook with new hash; copy button writes to clipboard (mocked) *(2)*

All Supabase calls in extracted hooks are isolated behind a single function call, so tests mock `@/integrations/supabase/client` with `vi.mock(...)` returning a `from(...).select/insert/update` chainable stub. A small helper `src/test/supabaseMock.ts` will be added to keep mocks DRY.

---

## Acceptance criteria
- No file in the touched set exceeds **~250 LOC** afterwards.
- `tsc --noEmit` passes.
- `vitest run` passes; coverage report shows the new files exercised.
- Visual diff: open Client Portal Editor, Project Settings dialog, Estimate Revisions tab, Change Requests tab, and Admin → Status Rules — each renders and behaves identically.
- No public import path changes outside the touched feature folders.

## Out of scope
- Any logic change, design change, or new feature.
- Edge function or RLS changes (covered in the security plan).
- Tests for components not being split.
