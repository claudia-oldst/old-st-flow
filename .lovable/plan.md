## Goal

Close the testing gap exposed by the recent refactor and update the README to reflect the new test posture. Storybook is explicitly out.

## Current state

- Vitest + RTL already wired (`vitest.config.ts`, `src/test/setup.ts`, scripts `test` / `test:watch`).
- 14 test files exist (small utils + a few components). No coverage on the hooks/sub-components produced by the refactor.
- README has a `Testing` section but it's stale — no coverage script, no fixtures convention, no list of what's covered.

## Scope

### 1. Test coverage for refactored code

Target the **pure logic** extracted during the refactor first — highest ROI, no DOM noise — then add hook tests and a thin layer of component smoke tests.

**Test infrastructure (new, shared):**
- `src/test/fixtures/` — typed factory functions for `tickets`, `epics`, `projects`, `users`, `time_logs` (built off generated Supabase types).
- `src/test/mocks/supabase.ts` — chainable mock of the supabase-js client (`from().select().eq()...`) returning configurable rows; used by all hook tests.
- `src/test/utils.tsx` — `renderWithProviders` wrapping with `QueryClientProvider` (fresh client per test), `MemoryRouter`, and `Toaster`.
- Add `@vitest/coverage-v8` devDep and `test:coverage` script (`vitest run --coverage`).
- Coverage targets: ≥ 70% on `src/features/**/use*.ts` and `src/features/**/*.{utils,helpers}.ts`; ≥ 50% statements overall on `src/features`.

**Pure utility / helper tests:**
- `features/tickets/filters/applyFilters.test.ts` — every filter dimension (status, assignee, epic, search), multi-combo, empty filter, no-match.
- `features/estimates/project-change-requests/buildChangeRequestGroups.test.ts` — grouping, ordering, empty input, mixed epics.
- `features/timelog/utils.test.ts` — duration / split math, boundary cases.
- `features/project/export/runExportProject.test.ts` — sheet-row builder functions (mock workbook writer; do not exercise file IO).
- `features/client-portal/epic-trend/usePortalEpicTrendData.test.ts` — extract and test the pure data-shaping function (split it out of the hook if still inlined).

**Hook tests (`renderHook` + mocked supabase):**
- `useStopGroup`, `useStartGroup`, `useLogTime` — state transitions, payload shape sent to mutations, error path surfaces a toast.
- `useBulkAssign` — slot reducer + submit payload.
- `useProjectHealth` — derived metrics from fixture rows.
- `useClientPortalEditor` — dirty-state detection, save payload.
- `useProjectSettings` — form → mutation payload, danger-zone guard.
- `useProjectsList` — filter/sort over fixture data.

**Component smoke tests (light, one render + one interaction):**
- `BulkActionsBar`, `TicketsFilter`, `ProjectCard`, `ProjectsToolbar`, `RuleRow`, `EpicChangeRow`, `EpicCRRow`, `Ring`, `HealthSummaryRow`, `PortalToolbar`.
- Each: render with minimal props, assert a key text/role, fire one interaction, assert callback fired or expected text changed.

### 2. README updates

- Rewrite the `Testing` section:
  - How to run: `npm test`, `npm run test:watch`, `npm run test:coverage`.
  - Conventions: `*.test.ts(x)` co-located with source; shared helpers under `src/test/{fixtures,mocks,utils.tsx}`.
  - What's covered: pure utilities, feature hooks, component smoke; what's intentionally not (E2E — flagged as future work).
  - Coverage thresholds (the numbers above) and how to read the report.
- Add a `Quality gates` subsection under `Contributing`: typecheck, lint, `npm test`, file-size ceiling (250 LOC).
- Update the `Project structure` tree to mention `src/test/` and co-located `*.test.tsx`.

## Out of scope

- Storybook (explicitly removed).
- E2E (Playwright) — future work, mention in README only.
- Visual regression.
- Backfilling tests for legacy untouched code outside the refactor surface.
- Auth / RLS work — tracked separately.

## Technical notes

- `renderHook` ships with `@testing-library/react` v16 (already installed) — no extra dep beyond `@vitest/coverage-v8`.
- Mock the supabase client via `vi.mock("@/integrations/supabase/client", …)` inside `src/test/mocks/supabase.ts`; tests import a `setSupabaseMock(rows)` helper.
- Keep tests deterministic: stub `Date.now` via `vi.useFakeTimers()` where timing matters (timelog).
- No network. No real Supabase. No real workbook generation.

## Deliverable shape

```text
src/test/
  fixtures/{tickets,epics,projects,users,timelogs}.ts
  mocks/supabase.ts
  utils.tsx
src/features/**/*.test.ts(x)         (new — per list above)
package.json                          (+ test:coverage script, + @vitest/coverage-v8)
vitest.config.ts                      (coverage config block)
README.md                             (Testing rewrite + Quality gates + structure tweak)
```

## Rollout order

1. Test infra (fixtures, supabase mock, `renderWithProviders`, coverage script + config).
2. Pure-util tests (no mocking required — fastest wins).
3. Hook tests, one feature at a time: timelog → tickets → health → portal → project → projects.
4. Component smoke tests.
5. README rewrite.
