# Migration Post-Mortem: Why old-st-flow → pulse FE Fidelity Came Out Low

> Root-cause analysis of the `/migrate-*` workflow run, based on four parallel audits:
> (1) the migration artifact chain in `pulse/old-st-flow-migration/` + `.specs/`,
> (2) a full source-vs-target diff of the Sprint page,
> (3) a reuse audit across all 12 migrated pages,
> (4) a design audit of the workflow prompts, agents, schemas, and gates.
> Generated 2026-07-02 on branch `feature-migration-improvements`.

---

## 1. Headline verdict

**The pipeline did not fail at building — it failed at *knowing what to build* and at *proving it built it*.**

Measured on the Sprint page (the worst and densest case): roughly **60% of the visual
surface and ~45–50% of the interactive functionality survived** (~55% weighted fidelity).
The Planning workbench landed at ~35%: the carryover flow is gone entirely, every
workbench bulk action is a no-op (the page never passes the callbacks), and the ticket
detail sheet is unreachable. Yet **every machine gate passed and Gate #2 was signed off.**

The loss is systematic, not random. It happened at three joints, and the gates were
structurally incapable of catching any of them:

| Joint | What was lost | Evidence |
|---|---|---|
| **Extraction depth cutoff** | Everything below composition level 2 | Sprint route card = 46 lines for a 25-file / ~2,400 LOC feature; `CarryoverReviewPanel`, `PoolRow`, `PoolFilterBar`, `PlanningRowTooltip` appear in **zero** migration artifacts; the card self-confesses `"not read in detail"` |
| **Spec-schema procrustean fit** | Layout, nesting, interactions, view modes | Page-spec schema is openly "Phase 1: list/detail/form" — it **invented a fictional `SprintsTable` + search bar** (which shipped into the product) because the real page shape had no schema slot |
| **Verification narrowness → authority inversion** | Any surface not in the shallow capture | Sprint parity PASS = 5 DOM dimensions × 2 states on the **Roadmap tab only**; Planning + Gantt tabs never driven; 7/11 routes had near-empty `.dom.json` ground truth; Gate #2 then signed off "destination-authoritative" and `--from-code` rewrote the specs from the built code — **permanently converting the loss into the new ground truth** |

---

## 2. The fidelity funnel (Sprint route, measured)

```
Source truth        23 components / 25 files / ~2,400 LOC, 3 sub-views, carryover, pool filters, DnD-lane logic
   ↓  route card    3 composites + Tabs, 4 one-line interactions, empty state MISSED ("not read in detail")
   ↓  inventory     12 components in 10 rows; 5 more as name-only composedOf strings; ≥4 NEVER recorded anywhere
   ↓  specs         7 composites on the page spec; 5 composedOf names left "# TODO"; SprintsTable INVENTED;
   |                everything blanket-stamped verified:true by --reconcile (incl. specs 40% unresolved)
   ↓  build         spec'd composites built well; TODO names built as inline "UNRESOLVED" stand-ins;
   |                never-inventoried surfaces never built; callbacks defined but never wired by page.tsx
   ↓  verify        5 dimensions × 2 states, Roadmap tab only → PASS issued
```

Each stage measured **closure of its own ledger, not fidelity to the source**:
extract PASS = every seed row has a terminal label (two FAILs were cleared by
"bookkeeping promotion", no re-analysis); build PASS = every spec has a file on disk;
story-parity PASS = every *source story* has a target story — but **45/62 composites had
no source story** (`stories=inferred`), so the gate was blind exactly where risk was
highest; parity PASS = the captured (shallow) DOM dimensions match.

**47 suggested-domain composites were deferred in one batch** and never spec'd or built.
**21 `composedOf` sub-component references were left as `# TODO`** — the builders turned
them into inline approximations, which is precisely the "pages hand-roll their own
components" symptom.

---

## 3. Root causes, ranked

### RC1 — Extraction stops too shallow, and nothing forces it deeper
`source-component-inventory` and `source-route-cataloguer` stop at ~2 levels of
composition. A route card can ship marked `documented` (terminal) while admitting
`confidence: low — not read in detail`. Whole rendered surfaces vanished **before any
gate existed to miss them** — every downstream coverage check audits against the
truncated inventory, so 103/103 = PASS while the real denominator was ~130+.

### RC2 — The page-spec schema cannot express real pages (and its escape hatch leaks)
`page-spec.schema.json` allows `layout: [list, detail, form]` and
`components[].kind: [data-table, detail-card, filter-bar]` only. No layout tree, no
sections, no nesting, no view modes, no interactions (DnD, group-by, column menus,
timers). Inexpressible surfaces go to a "Deferred" line **in the spec-writer's chat
report**, which no downstream consumer of a page build ever reads. Normative content
degrades into YAML comments the schema doesn't validate and the builder isn't required
to honor. Worse: the schema *forces fiction* — a data-table page shape was invented for
Sprints to satisfy the schema, and it shipped.

### RC3 — Reuse is enforced only as a whitelist, never as a mandate
The builder is told "**never invent** a composite not in the catalog" — but nothing says
"**must render everything** in `composites[]`" or "**must not re-implement** an existing
composite under another name." The one check aimed at inlining
(`validate-composite-reuse.mjs` "built-but-unused") is **informational only** and runs in
`/migrate-build-ui` — *before any page exists* — so it's guaranteed noise and never re-run.
Meanwhile the sanctioned `deferred` path means a page missing composites ships green:
placeholder + report line, no loop back to `/migrate-build-ui`, no page rebuild.

Result (measured): `sprint-workbench.tsx` inlines `PlanningPoolPanel`,
`PlanningDevColumn`, `WorkbenchBulkBar` as private functions self-labeled
`"UNRESOLVED (no sibling spec)"`; a bespoke 670-line `sprint-ticket-board.tsx` duplicates
the existing 801-line shared `tickets-list.tsx` and ignores the already-built
`sprint-pool-filter.tsx` that the tickets page uses.

**CORRECTION (developer feedback, confirmed by git forensics):** the reuse audit's
8.5/10 score measured the **current tree — which is post-human-correction, not pipeline
output.** Git history shows the raw pipeline output (`d843184`, "all 11 migration pages
(--mock)") was followed by a dedicated manual **"full component-reuse pass"**
(`ad5052a`: **152 files, +8,662/−8,140 lines**) and a further parity port (`64faa74`:
**86 files, +9,258/−4,050 lines**, incl. `tickets-list.tsx` +~750 lines) before the tree
reached the audited state. **~18k lines of human correction is the true measure of the
pipeline's raw reuse/fidelity quality** — the v1 output would have scored far lower.

What remains true and important: the reuse failure is *concentrated exactly where specs
were missing*. The builder followed its rules — **the rules made the omissions legal.**
The same run also produced the inverse failure: 5 orphaned composites built from draft
specs that pages later abandoned during Gate-#2 rework, never retired
(`estimate-revisions-table`, `estimate-revision-filters`, `create-cr-ticket-form`,
`error-boundary`, `logoff-summary-button`).

**Target going forward: 10/10 reuse, zero compromise, enforced mechanically** — see R3
and R9. A score achieved by human cleanup passes does not count; the gate must hold on
the pipeline's raw output and stay in CI so manual edits can't regress it either.

### RC4 — No gate verifies pages, and no gate exercises behavior
- `parity-verifier` diffs 6 shallow DOM dimensions per captured state; it never clicks,
  filters, drags, or opens a dialog. A missing group-by menu, dead bulk bar, or unwired
  detail sheet is invisible to all six dimensions.
- `story-parity-auditor` covers components only — pages have no story surface.
- Nothing checks a page's imports/rendered JSX against its spec's `composites[]` manifest.
- Nothing checks **wiring completeness**: composites expose callback props
  (`onCarryOver`, `onEditSprint`, `detail`, `onTicketClick`) that `page.tsx` simply never
  passes — the components support the features; the data/handlers never arrive. Same
  class: `GanttBar` supports status-segmented bars, but the adapter never computes the
  counts, so the legend describes colors that never render.

### RC5 — The page builder's information diet excludes every high-fidelity source
`migration-page-builder` receives: page spec + domain spec + composite catalog glob +
fixtures + (optional, `--mock`-only) screenshots. It **never reads the route card, the
source code, or SPEC-DELTAS.md**, and it cannot see composites the spec-writer forgot
(no barrels, no catalog doc — discoverability is by memory). Compression is one-way and
unrecoverable at build time. Aggravating: its required-reading skill
(`parse-page-spec/SKILL.md`) normalizes the spec **without a `composites` field at all** —
the canonical data model contradicts the agent definition.

### RC6 — Repair loops exist only for machine-legible failures
Compile/test/story-matrix failures self-heal via the Stage-C fix loop. **Fidelity
failures — the entire subject of this post-mortem — terminate in reports for a human**
(Gate #2 summaries, "fix-now items"), with no automatic builder re-dispatch carrying the
diff findings.

### RC7 — Capability inversion + trust inversion at the end
The guide steers the page phase to the cheapest configuration ("build/pages/verify
tolerate a cheaper session model"; builders pinned to Sonnet) even though page
reconstruction from a lossy spec is the most judgment-heavy generative step. Then the
endgame inverted authority: 5 parity FAILs accepted as "destination-authoritative",
2 known-unfinished routes shipped, and `--from-code` re-derived specs from the built
code — after which **the specs certify the degraded output as correct**.

---

## 4. Assessment of the proposed ideas

| Proposal | Verdict |
|---|---|
| **Verification loop against a goal ("/goal")** | ✅ Right instinct, needs to be *mechanical*, not aspirational. A free-text goal won't move the needle; a per-page **acceptance contract** (see R3) + an auto-repair loop (see R5) will. The loop must consume machine-readable diff findings, not prose. |
| **Harness + looping** | ✅ Exactly the right shape: build → verify (adversarially, against source ground truth) → emit punch list → re-dispatch builder with the punch list → re-verify, until clean or budget. Today the workflow has this loop for compile errors only; extend it to fidelity. |
| **JSON structure listing a page's components** | ⚠️ **Partially exists and failed** — `composites[]` in the page spec is exactly this, but it's (a) flat with no layout/section tree, (b) populated from a truncated inventory, (c) non-normative in practice (no gate checks it), (d) dropped by the parser skill. The fix is not "add a JSON file" but: make the manifest a **composition tree + wiring contract**, populate it from a leaf-level inventory, and **hard-gate the built page against it**. |

---

## 5. Recommendations (prioritized)

### R1 — Gate extraction on leaf-level coverage of the feature directory (fixes RC1)
- `source-component-inventory` must recurse to leaf components. New deterministic gate:
  **every `.tsx` file under the source feature folder must appear in an artifact**
  (inventory row, route card, or explicit skip-with-reason). `CarryoverReviewPanel`
  having 0 hits anywhere becomes impossible.
- A route card may not go `documented` while carrying `confidence: low / not read in
  detail` — low confidence **blocks** (re-dispatch the cataloguer on that route) instead
  of annotating.
- Route cards get a mandatory per-section composition block: for each visual region,
  the components inside it, the interactions on it, and the states it can be in.

### R2 — Replace the Phase-1 page schema with a composition model (fixes RC2)
Page spec v2 must express:
- **Layout tree**: nested sections/slots (`header → toolbar → [GroupBySelect, FilterMenu,
  SprintPoolFilter×2, Search]`, `main → Tabs[roadmap → …]`), not a flat list.
- **Interaction inventory**: dnd, group-by, view toggles, dialogs, bulk bars, timers —
  each mapped to the composite that owns it.
- **View modes / tab states** as first-class (each becomes a required capture + verify
  state).
- **No fiction rule**: if a page doesn't fit an archetype, the schema must degrade to the
  generic composition tree — never force a `data-table` shape onto a tabs page.

### R3 — Per-page acceptance contract + hard composition gate (fixes RC3, the "/goal" idea)
New deterministic script, run in `/migrate-page` Phase 2 AND `/migrate-verify`:
`validate-page-composition.mjs` —
- Every `composites[]` entry is **imported and rendered** by the page → else FAIL.
- Every callback/prop the composite spec declares `required` is **passed** by the page
  (kills the no-op-bulk-bar class) → else FAIL.
- No local component/JSX block duplicates a cataloged composite (structural-similarity
  check + a "before writing a domain component, search the catalog" builder rule) → FAIL.
- `deferred` is no longer green: a deferred composite **blocks the page** and
  auto-enqueues `/migrate-build-ui` for it (or requires explicit human sign-off recorded
  as a punch-list issue).
- Re-run `validate-composite-reuse.mjs` **after** pages exist; promote "built-but-unused"
  from info to failure (catches orphans AND inlining).

### R4 — Verify behavior, not just static DOM (fixes RC4)
- Capture spec (Gate #1) must drive **every tab, dialog, and interactive state** listed
  in the route card — a route whose captured states < the card's state inventory fails
  Phase B.6 deterministically.
- Enrich the `.dom.json` extractor: record toolbars, buttons, menu items, inputs,
  interactive affordances — not only table columns/badges/headings. (7/11 routes had
  near-empty ground truth; nothing can be verified against nothing.)
- `parity-verifier` v2 gets an **interaction script** per route (click each tab, open
  each dialog, apply one filter, select rows → assert bulk bar) generated from the route
  card's interaction inventory.

### R5 — Close the loop: auto-repair on fidelity findings (fixes RC6, the harness+loop idea)
- Parity/composition FAIL → findings emitted as **machine-readable punch list**
  (missing composite X in section Y; callback Z not wired; state W not reachable) →
  orchestrator re-dispatches `migration-page-builder` with the punch list → re-verify
  **only the failed dimensions** → loop until clean or N=3 rounds, then human gate.
- Same loop shape for `/migrate-build-ui` composites against their crops.
- Only after the loop converges does a human see Gate #2 — humans adjudicate taste and
  accepted diffs, not mechanical omissions.

### R6 — Feed the builder real ground truth (fixes RC5)
- `migration-page-builder` inputs must include: the **route card**, the **source page
  file path** (read-only reference), the screenshots (mandatory, not optional), and the
  **full built-component inventory** (add per-domain barrels or a generated
  `components/CATALOG.md` the builder must consult before writing any new markup).
- Fix `parse-page-spec/SKILL.md` to carry `composites[]` through normalization.

### R7 — Kill the trust inversions (fixes RC7 + process hygiene)
- `--reconcile` promotes specs **individually**: a spec with unresolved `# TODO`s or
  unexpressed behavior cannot flip to `verified: true`.
- `coverage-auditor` may not clear a FAIL by status promotion without re-analysis.
- "Destination-authoritative" sign-off requires a recorded **per-diff punch list** that
  becomes tracked issues — never a blanket acceptance; `--from-code` must refuse to
  reconcile a spec whose route has open fidelity findings.
- Run the pages phase on a high-capability model; it is the most judgment-heavy step,
  not the most mechanical one.

### R8 — Immediate remediation for the Sprint page (independent of workflow fixes)
1. Wire `workbench` callbacks + `detail`/`onTicketClick` in `sprints/page.tsx`; add
   sprint-ticket mutations to the adapter.
2. Rebuild pool-panel filtering/grouping (`PoolFilterBar`, `usePoolGroups`, `PoolRow`).
3. Rebuild the carryover flow (`CarryoverReviewPanel` + `useCarryoverTickets`).
4. Compute status counts in `getGanttRows` (status-segmented Gantt) + discipline rows.
5. Replace inline `PoolSelect` with the existing shared `sprint-pool-filter.tsx`;
   reconcile `SprintTicketBoard` with `TicketsList` to stop the two tabs drifting.

### R9 — Standing reuse gate in CI (the 10/10 mandate)
Reuse is not a migration-time concern only — it must be a **permanent, blocking CI
check** so neither pipeline output nor later manual edits can regress it:
- `validate-page-composition.mjs` (R3) and `validate-composite-reuse.mjs` (with
  "built-but-unused" promoted to failure) run on every PR touching
  `apps/webapp/src/**`, not just during `/migrate-*` runs.
- Add a **structural-duplication detector**: flag any page-local component or JSX block
  whose rendered element/primitive composition is ≥N% similar to an existing cataloged
  composite (catches `sprint-ticket-board` vs `tickets-list` — same-name-only detection
  provably missed it).
- Ban route-local `_components/` folders for anything with >1 potential consumer; the
  lint rule forces promotion into `components/{domain}/` + a composite spec.
- Generated per-domain barrels + `components/CATALOG.md` kept fresh by a script, so
  "didn't know it existed" stops being a possible cause — for agents and humans alike.
- Acceptance bar for any future migration: **the raw pipeline output passes these gates
  with zero human cleanup commits.** A "reuse pass" commit like `ad5052a` appearing in
  history means the workflow failed, regardless of gate status.

### R10 — Composition-parity gate via a formalized primitive map (developer proposal)
The source→target primitive mapping table **already exists** in
`components/_classification.md` (button→Button, select→Select, dialog+alert-dialog→Modal,
pagination→ListPagination fold, ThinCapBar→CapacityIndicator `variant="thin"` absorb…)
— but nothing ever verifies through it. Build the bridge:

1. **Formalize the map**: `_classification.md` prose → machine-readable
   `.specs/primitive-map.yaml` with mapping kinds — `rename` (1:1), `absorb`
   (part → variant/prop of another), `fold` (N→1 or primitive→composite),
   `keep-extra` (target-only additions allowed), `drop` (forbidden without sign-off).
   Include raw-HTML mappings (`<select>` → Select, `<table>` → Table/TicketsList).
2. **Derive source composition deterministically**: AST-parse each composite's
   `sourceRef` (and each source page) → the actual rendered parts list. **Generate
   `composedOf` from this + the map** instead of letting a spec-writer hand-derive it —
   this closes the extraction-depth hole at the composite level (the 21 `# TODO`s and
   inline "UNRESOLVED" stand-ins all trace to hand-derived, under-listed `composedOf`).
3. **`validate-composition-parity.mjs`**: AST-parse the built target file (imports +
   JSX identifiers + raw HTML elements) and diff against map(source composition).
   FAIL on: expected part missing (would have caught `sprint-workbench.tsx` not
   importing PlanningPoolPanel/PlanningDevColumn/WorkbenchBulkBar), raw HTML where the
   map names a primitive, or a local function duplicating a mapped part. Only recorded
   `absorb`/`fold`/`keep-extra` deltas are allowed. Same check one level up for pages
   (page parts = mapped source-page composites — this is R3's manifest, now generated
   rather than hand-written).
4. Runs in `/migrate-build-ui` Stage C, `/migrate-page` Phase 2, and permanently in CI
   (R9). Fully deterministic — static AST on both sides, no booting, no LLM judgment.

Caveat: composition parity verifies **structure, not wiring** — a 1:1 composite with
dead callbacks still passes. It is the structural third of the gate; R3 (required-
callback wiring) and R4 (behavior-driving parity) remain necessary.

### Quick wins (from the reuse audit, ~hours)
Delete/wire the 5 orphaned composites; add per-domain barrels or a catalog doc; extract
shared `NoProjectSelected` + `InlineError`; adopt `FilterBar`/`SearchInput` in the 3
hand-rolled page toolbars; move sprints page data-shaping into `_data/` selectors
(health-page pattern); factor the ~150 duplicated lines between
`estimate-revisions` and `change-requests-cr`.

---

## 6. On the effort-estimate criticism

The external model's critique ("bottom-up estimates from reading code systematically
under-count; expect 60–90h not 42–55h") is consistent with what this audit found — and
this repo now has a measured data point: the "finished" pipeline output required
**~18k lines of human correction across 238 file-changes** (the reuse pass + parity
port) before it was acceptable. That correction labor is exactly the tail the estimate
missed. The mechanism is now identifiable: **the ledger-closure gates manufacture false
confidence.**
Every "PASS" measured coverage of a truncated denominator. Estimates built on those
artifacts inherit the truncation — the invisible 40% (leaf components, wiring, behavior)
is precisely "the glue, surprises, and integration [that] never show up in the per-file
tags." Fixing R1 (real denominator) and R3/R4 (fidelity-measuring gates) is also what
makes future estimates honest.
