# Migration Process — What Went Wrong & How To Fix It

> Simple, issue-by-issue version of the post-mortem, for review and discussion.
> Each issue has: the problem in plain language, a real example from our run, and the fix.
> Deep technical version: `MIGRATION-ANALYSIS-REPORT.md`. Branch: `feature-migration-improvements`.
>
> **The one-sentence summary:** the pipeline built what it was told correctly — but it was
> told too little (shallow extraction), the format it was told in couldn't express real
> pages OR real domains (impoverished YAML schemas), and nothing checked the result
> against the real source (shallow verification, zero backend verification). Then ~18k FE
> lines + ~14k BE lines of manual fixes hid the damage.
>
> **Verdict on the "weak specs ← weak extraction" hypothesis:** TRUE for the frontend
> (extraction depth cutoff was the #1 FE loss). **Mostly REJECTED for the backend** — the
> backend cards were rich (13/15 ticketing triggers captured with citations, full endpoint
> + auth tables, access patterns quantified). The backend's losses came from: (a) the
> domain-spec YAML schema ceiling (card→spec hop destroyed the richness), (b) a workflow
> hole — no stage ever owned client-common wiring, (c) genuine extraction misses were only
> ~10–15% of rules, concentrated in **client-side React business logic** (the capacity
> gate, weekly aggregates, EditTimeLog). Both halves share one structural disease:
> **rich Markdown cards → impoverished YAML → builders read only the YAML → gates check
> the YAML, never the source.**

**Legend:** 🔴 caused direct fidelity loss · 🟠 let the loss pass undetected · 🟡 made it worse / hid it

---

## STAGE 1 — EXTRACTION (reading the source app)

### Issue #1 🔴 Extraction stops too shallow — leaf components simply vanish
**Problem:** The extraction agents read ~2 levels of component nesting and stop. Anything
deeper never gets recorded anywhere — so no later stage can build it, spec it, or even
notice it's missing. Every downstream "coverage: 100%" is measured against this
incomplete list.

**Example:** The Sprint feature is 25 files / ~2,400 lines. Its route card
(`routes/route-project-sprints.md`) is **46 lines** and names only 3 composites + Tabs.
`CarryoverReviewPanel` (a 150-line source feature), `PoolRow`, `PoolFilterBar`, and
`PlanningRowTooltip` appear in **zero** migration artifacts — they were never seen, so
they were never built. That's why the Planning tab landed at ~35% fidelity.

**Fix (R1):** A deterministic gate: **every `.tsx` file in a source feature folder must
appear in an artifact** (inventory row, route card, or explicit "skipped because X").
A file with 0 mentions = extraction FAILS. Simple file-list diff, no AI judgment needed.

**Decision:** ___

---

### Issue #2 🔴 "Low confidence" is allowed to ship
**Problem:** A route card can admit it didn't finish the job and still count as done.
Nothing forces a re-read.

**Example:** The sprint route card literally says
`confidence: low · verify — exact ForecastingCalendar sub-forms (not read in detail)` —
and was still marked `documented` (terminal status). It also missed the page's empty
state ("No sprints yet." + "Create first sprint" exist in source).

**Fix (R1):** `confidence: low` **blocks** — the orchestrator re-dispatches the
cataloguer on that route until confidence is high or a human explicitly accepts the gap
in writing. "Not read in detail" becomes an impossible sentence in a terminal artifact.

**Decision:** ___

---

### Issue #3 🟡 47 composites deferred in one batch, then forgotten
**Problem:** Domain cards suggested 47 composites (SprintCapacityBar, TicketFilterBar,
LogTimeForm, ActiveTimerWidget…). All 47 were deferred in a single decision during spec
generation — and nothing ever surfaced them again. Deferral is a one-way door.

**Example:** `_plans/PLAN-to-specs.md:72` — the whole list deferred at once; none were
ever spec'd or built.

**Fix (R7):** Every `deferred` item must carry a ticket/punch-list entry that shows up at
Gate #2 as an unresolved list the human must re-confirm. Batch-deferral of more than N
items requires itemized sign-off.

**Decision:** ___

---

## STAGE 2 — SPECS (translating what was read into build contracts)

### Issue #4 🔴 The page-spec format can't describe real pages — so it invents fiction
**Problem:** The page-spec schema only knows 3 page shapes (`list`, `detail`, `form`) and
3 component kinds (`data-table`, `detail-card`, `filter-bar`). Real pages have tabs,
boards, panels, toolbars, drag-and-drop, dialogs. When a page doesn't fit, the spec
writer forces it into a shape that does fit — producing a spec that describes a page
that doesn't exist.

**Example:** `page-project-sprints.yaml` contains a `SprintsTable` with sortable columns
and a "Search sprints" filter bar. **The source page has no table and no search box** —
it's a banner + three tabs. The invention shipped: the built page has a search box the
source never had, in a spot the source used for its real toolbar.

**Fix (R2):** Page spec v2 = a **composition tree**: nested sections/slots
(`header → toolbar → [GroupBy, FilterMenu, PoolFilter×2, Search]`,
`main → Tabs[roadmap|planning|gantt]`), an interaction list (dnd, dialogs, toggles),
and view modes as first-class states. Rule: if a page doesn't fit an archetype, use the
generic tree — **never force a shape**.

**Decision:** ___

---

### Issue #5 🔴 Composite parts lists are hand-written by the AI — and left half-empty
**Problem:** Each composite spec has a `composedOf` list (what it's made of). Today an
agent writes it by reading source code — so it inherits Issue #1's blindness. Unresolved
names get a `# TODO` comment, and the builder then improvises an inline substitute.

**Example:** `composite-SprintWorkbench.yaml` lists PlanningPoolPanel,
PlanningDevColumn, WorkbenchBulkBar — each tagged
`# TODO: unresolved — no sibling spec exists; build composite first`. The builder's
output `sprint-workbench.tsx` says it out loud:
`"PlanningPoolPanel — UNRESOLVED (no sibling spec): rendered as inline presentational panel"`.
That inline panel has no filtering, no grouping, no search — the source panel had all three.
21 `composedOf` references across the run ended this way.

**Fix (R10 — your primitive-map idea):** Stop hand-writing `composedOf`.
**Generate it**: AST-parse the source file → actual parts list → map through
`.specs/primitive-map.yaml` (the source→target table that already exists in
`_classification.md`: button→Button, select→Select, dialog→Modal,
ThinCapBar→CapacityIndicator `variant="thin"`…). A generated list can't under-report.
And a `# TODO` in `composedOf` **blocks the build** — it auto-enqueues the missing
composite instead of licensing an inline substitute.

**Decision:** ___

---

### Issue #6 🟠 Everything got stamped "verified" in one blanket pass
**Problem:** After Gate #1, `--reconcile` flipped **every** spec to
`verified: true / verifiedAgainst: live-app` — including specs still full of unresolved
TODOs. "Verified" stopped meaning anything, so builders trusted specs that were 40%
holes.

**Example:** `composite-SprintWorkbench.yaml` carries `verified: true` while 3 of its 7
parts are `# TODO: unresolved`. The entire sprint area's Gate-#1 evidence was **one
line** in SPEC-DELTAS.md.

**Fix (R7):** Per-spec promotion only. A spec cannot become `verified: true` while it
contains any unresolved TODO or unexpressed behavior. Partial = stays `draft`, and
draft specs can't feed `/migrate-page`.

**Decision:** ___

---

## STAGE 3 — BUILD (writing the code)

### Issue #7 🔴 Reuse is enforced backwards
**Problem:** The builder has one reuse rule: "never invent a composite that's not in the
catalog." There is no rule saying "you **must** render everything in the manifest" or
"you **must not** re-implement something that already exists under a different name."
So omitting components and duplicating components are both *legal*.

**Example (duplication):** `sprint-ticket-board.tsx` — a bespoke **670-line** board that
re-implements the existing shared **801-line** `tickets-list.tsx`, and re-implements a
weaker single-select pool filter while the shared `sprint-pool-filter.tsx` (built, used
by the tickets page) sat unused. The source deliberately shared this component between
tabs ("so the look and behavior match the Tickets tab exactly"); the target forked it —
now the two tabs drift.

**Example (omission):** the `deferred` path — a page missing composites ships green with
placeholders, and nothing loops back to build them.

**Fix (R3 + R10):** `validate-composition-parity.mjs` + `validate-page-composition.mjs`:
- every manifest part must be **imported and rendered** → else FAIL
- raw HTML/local function duplicating a mapped part → FAIL
- `deferred` blocks the page and auto-enqueues `/migrate-build-ui`
Both static AST checks — cheap, deterministic, no AI judgment.

**Decision:** ___

---

### Issue #8 🔴 Components got built, wiring didn't — features silently dead
**Problem:** A composite can expose callback props for its features, the page just…
never passes them. The component "supports" the feature; the user never gets it. No
check exists for this.

**Example:** `sprint-workbench.tsx` defines `WorkbenchBulkCallbacks` (assign / move /
carry-over / remove) — `page.tsx:309-327` passes **none of them**. Every bulk button is
a no-op. Same class: the detail sheet renders only if `detail` is passed — it never is,
so clicking a ticket does nothing. Same class again: `gantt-bar.tsx` supports
status-segmented bars, but the adapter never computes the counts — so the legend
describes colors that never appear.

**Fix (R3):** Composite specs declare which props/callbacks are **required**. A page
that renders the composite without passing them FAILS the wiring check. Adapter
contract: every data field a composite's spec consumes must be produced by the adapter.

**Decision:** ___

---

### Issue #9 🟠 The page builder is blind — it never sees the real page
**Problem:** The page builder receives: the (fictional, see #4) page spec, the domain
spec, fixtures, and *optionally* screenshots. It **never reads the route card, the
source page code, or the catalog of already-built components.** It can't reuse what it
doesn't know exists, and it can't restore what the spec dropped. Bonus bug: its
required parsing skill (`parse-page-spec`) **drops the `composites[]` field entirely**
during normalization.

**Example:** No barrels/index files exist under `components/` — an agent (or human)
must already know `layout/filter-bar.tsx` exists to use it. Result: 3 pages hand-rolled
toolbars while `FilterBar` + `SearchInput` sat in the tree; 6 pages hand-rolled the
"No project selected" guard 4 different ways.

**Fix (R6):** Builder inputs become: route card + source page path (read-only
reference) + screenshots (mandatory) + a generated `components/CATALOG.md` + per-domain
barrels. Fix the `parse-page-spec` skill bug. Builder rule: "before writing any new
markup, search the catalog; record why nothing matched."

**Decision:** ___

---

### Issue #10 🟡 The hardest step ran on the cheapest configuration
**Problem:** The guide recommends dropping to a cheaper model for the build/pages phase,
and the page/composite builders are pinned to Sonnet. But rebuilding a complex page from
a lossy spec + screenshots is the single most judgment-heavy step in the pipeline.

**Fix (R7):** Pages phase runs on a high-capability model. Cheap models are fine for
mechanical stages (spec YAML emission, fixture generation) — not for page
reconstruction.

**Decision:** ___

---

## STAGE 4 — VERIFICATION (proving it matches)

### Issue #11 🔴 Parity "PASS" measured almost nothing
**Problem:** The parity check diffs 6 shallow DOM dimensions (headings, tab labels, table
columns, row counts, badges, empty-copy) on captured states only. It never clicks,
filters, drags, opens a dialog, or switches tabs. And for non-table pages the capture
itself recorded almost nothing to compare against.

**Example:** Sprint parity = **PASS**, based on: heading text, 3 tab labels, sprint-row
count, status-group counts, empty copy — **Roadmap tab only**. The Planning and Gantt
tabs — where fidelity was 35% — were **never driven**. 7 of 11 routes had near-empty
`.dom.json` ground truth ("the sprints page uses none of those structures, so the source
dom.json recorded only headings + tabs").

**Fix (R4):** (a) Capture every tab/dialog/interactive state listed in the route card —
fewer captured states than the card lists = deterministic FAIL before Gate #1.
(b) Enrich the DOM extractor: toolbars, buttons, menus, inputs — not just tables.
(c) Parity v2 runs an interaction script per route (click each tab, open each dialog,
apply a filter, select rows → assert the bulk bar appears).

**Decision:** ___

---

### Issue #12 🟠 No repair loop for fidelity — only for compile errors
**Problem:** When a build fails to compile, the workflow auto-fixes and retries. When a
page fails *fidelity* (the thing this whole post-mortem is about), the finding goes into
a report for a human. The expensive loop — find gap → tell builder → rebuild → recheck —
was done manually, by you.

**Fix (R5 — your harness+loop idea):** Fidelity findings become a machine-readable punch
list ("PlanningPoolPanel missing from section main.planning.left"; "onCarryOver not
wired"; "state planning-tab unreachable") → orchestrator re-dispatches the builder with
the punch list → re-verifies only the failed items → loops until clean or 3 rounds →
only then a human looks. Humans adjudicate taste; machines chase omissions.

**Decision:** ___

---

### Issue #13 🟠 The endgame made the broken output the new "truth"
**Problem:** At Gate #2, 5 parity FAILs were accepted as "destination-authoritative"
(2 routes known-unfinished, shipped anyway). Then `--from-code` rewrote the specs **from
the built code**. From that moment, the specs certify the degraded output as correct —
the loss became permanent and invisible.

**Example:** Memory + PARITY-SUMMARY: "parity signed off 2026-06-29
destination-authoritative; 5 diffs accepted, 2 known-unfinished shipped."

**Fix (R7):** "Accept as destination-authoritative" requires a per-diff punch list that
becomes tracked issues — never blanket acceptance. `--from-code` refuses to reconcile
any spec whose route has open fidelity findings.

**Decision:** ___

---

## CROSS-CUTTING

### Issue #14 🟠 Every gate measured "did we close our own list", not "does it match the source"
**Problem:** Extract PASS = every inventoried item has a status label. Build PASS =
every spec has a file. Story-parity PASS = every *source story* has a target story — but
**45 of 62 composites had no source story**, so the gate was blind exactly where risk
was highest. Coverage FAILs were even cleared by "bookkeeping promotion" (relabeling,
no re-analysis). Truncate the list early (Issue #1) and every later gate passes
honestly while the product is missing 40%.

**Fix (R1+R4+R7):** Gates must compare against **source ground truth** (file lists, AST
compositions, captured behavior), never against pipeline-internal lists. Ban
status-promotion without re-analysis. `stories=inferred` composites get spec-synthesized
story matrices so the story gate has something to hold them to.

**Decision:** ___

---

### Issue #15 🟡 Human cleanup hid the real quality (and the real cost)
**Problem:** The current tree looks decent (reuse ~8.5/10) only because of manual
correction: a "full component-reuse pass" (**152 files, +8,662/−8,140 lines**) plus a
parity port (**86 files, +9,258/−4,050**) — ~18k corrected lines the pipeline's gates
never saw as failure. This is also exactly why the 42–55h estimate was low: the
correction tail was invisible to the artifacts the estimate was built from.

**Fix (R9 — the 10/10 mandate):** The reuse/composition/wiring gates run **permanently
in CI**, not just during migration — on raw pipeline output and on every later PR.
Acceptance bar for the next migration: **zero human cleanup commits needed.** If a
"reuse pass" commit ever appears again, the workflow failed regardless of gate status.

**Decision:** ___

---

## STAGE 5 — BACKEND PATH (specs → /new-domain → contracts → wiring)

> Context from git forensics: the 11-domain rebuild took **5.6 hours** (~60k LOC). The
> correction phase took **~45 hours** and landed as one mega-commit (`7c72689`,
> +13.7k backend LOC ≈ 23% of the rebuild's output). The gap audit's scorecard against
> the "✅ built, high quality" backend: **5 blockers + 13 major + 14 minor**, remediation
> estimated at 6–7 weeks. The rebuild shipped at least **4 literal no-ops** (delete-cascade
> adapters that only logged, a `ReapplyStatusRules` that did nothing) — all passing 78
> green unit tests.

### Issue #16 🔴 The domain-spec YAML is a ceiling that destroys what extraction captured
**Problem:** The domain-spec schema can express exactly: one entity + typed fields +
enum values + index names + free-text strings. No slots for: child entities (aggregates),
structured business rules, state machines, derivations, triggers/side-effects, event
payloads/consumers, endpoints/DTOs, ownership/auth, identity model. Everything the rich
extraction card captured gets demoted to prose `businessRules` strings or `# TODO:` YAML
**comments — which the parser literally cannot see**. And `/new-domain` reads ONLY this
YAML — never the card, never `api/INDEX.md`, never the source.

**Example:** `domain-ticketing.yaml:184-197` is literally
`# TODO: TicketAssignee cannot be expressed as a separate entity in this schema file.`
The card's 21-endpoint auth table → dropped (no schema slot). Event names shipped bare —
which directly produced gap B-2: the publisher emits `TICKET_CREATED/UPDATED` while the
consumer only routes `GITHUB_SYNC_TICKET_REQUESTED`. Status transitions are *invented*
by the parser from enum adjacency, not the source's real transition graph.

**Fix:** Domain-spec schema v2: `entities[]` (children with own fields/keys/GSIs),
structured rules `{trigger, guard, effect, crossDomainWrites, evidence}`, per-use-case
`auth: {actor, ownership, roles}`, `derived:` field markers, `endpoints[]` + DTO shapes
(sourced from `api/INDEX.md`), event contracts `{name, payload, producer, consumers}`.
Plus: `/new-domain` must read the domain card + api catalog as mandatory context, not
just the YAML.

**Decision:** ___

---

### Issue #17 🔴 Nobody owns the FE wiring layer — it structurally cannot get built
**Problem:** `@pulse/client-common` (API clients + React Query hooks) is the only
production layer in the pipeline with **no builder agent, no plan artifact, and no
gate**. The guide's Step 8 says "then add the API client + hooks via the skill" — a
sentence, not an orchestrated step. Inside `/new-domain`, the wiring phase (Phase 8) is
gated on interview question 9 — **which the spec-file path skips**, and the schema has
no slot to record the answer. So for every migrated domain it silently never fires.

**Example:** REMEDIATION-PLAN B-1: "**0 of 11 clients, 0 of ~89 hooks**; 12 real
adapters `throw`" — the backend was declared done with the entire data-access layer
unbuilt. All ~90 hooks (+3,249 LOC) were hand-built later in one pass, using the mock
adapters as the de-facto spec.

**Fix:** A dedicated, orchestrated **client-common wiring stage** (new agent or a
`/migrate-wire-clients` step): generates per-domain clients + hooks from page-spec
`dataSources` + contracts, immediately after each `/new-domain`. The mock adapters
already declare the exact hook surface — use them as the generation contract, by design
instead of by accident.

**Decision:** ___

---

### Issue #18 🟠 The backend has zero parity verification — no-ops ship green
**Problem:** The FE gets three gates and fixture-driven DOM parity. The rebuilt backend
gets `nx test` coverage thresholds and one happy-path CRUD E2E. Nothing ever replays the
canonical fixtures or the 105-operation `api/INDEX.md` catalog against the rebuilt
endpoints. Unit tests run against in-memory mocks that don't enforce real DB semantics.

**Example:** `DeleteTicket`'s cross-domain cascade shipped as `Noop*DeleteAdapter`s that
only logged. `ReapplyStatusRules` was a no-op. A OneTable `hidden:true` sort-key bug
500'd on every rule-position change. All invisible to 78 green tests; all found at
runtime by a human. The `z.coerce.boolean()` bug made `?isArchived=false` coerce to
`true` — the projects list queried the archived partition and returned 0 rows.

**Fix:** **Gate #2.5 — backend parity**: seed the rebuilt services from
`{source}-migration/fixtures/`, replay every catalogued operation, diff responses
against `api/INDEX.md` DTOs + recorded source semantics. Generate E2E specs from the op
catalog (not "at least one CRUD spec"). RUNBOOK "verify-at-runtime" items get a
consuming step — today they're written down and never checked.

**Decision:** ___

---

### Issue #19 🟠 Contracts are generated blind to the source API surface
**Problem:** `api/INDEX.md` catalogs 105 source operations with DTOs, auth, and
side-effects — and **no builder ever reads it**. Contracts are regenerated from entity
fields + hand-tightening. Joined response shapes (`TicketRow` with `epic{}`, `parent{}`,
`assignees[]`), pagination envelopes, and RPC payloads have no source of truth on the
build path. The readiness check (`--check-backend`) greps hook *names* against a global
export list — a same-named hook from another domain, or even a `type`, false-passes.

**Example:** Missing `ticketDetailResponseSchema`, unexported `TimeLogPageResponse`,
DELETE returning 200 not 204, enum-casing mismatches pushed onto every FE adapter — all
hand-fixed in the correction commit.

**Fix:** Domain spec v2 carries `endpoints[]`/DTOs from `api/INDEX.md` (Issue #16);
a validator diffs built contracts + controllers against the op catalog (every source op
→ implemented | explicitly deferred); readiness check verifies the full chain
hook→client→endpoint→contract per domain, not name-presence globally.

**Decision:** ___

---

### Issue #20 🟡 The DB decision: right analysis, unguarded override
**Problem (and honest framing):** extraction did this part well — it recommended
**Prisma for all 11 domains** ("no context was a clean DynamoDB candidate"), quantified
the hard patterns, and the adversarial reviewer confirmed. The all-DynamoDB choice was a
**developer override at the classification gate**. The process failure: the override was
blanket (one decision for 11 domains), was never adversarially reviewed (the reviewer
runs *before* the gate), happened *before page specs existed* (so the FE's real query
needs weren't on the table), and no validator ever re-checked chosen keys/GSIs against
page dataSources. The predicted costs became the shipped defects, verbatim.

**Example:** the ticketing card warned "in-memory filtering may need to page through
multiple GSI3 pages to fill a result page" → REMEDIATION m-8: "List filtering operates
on a single GSI3 page (no fill-loop)". Patterns never catalogued (weekly Σ hours,
capacity Σ pending deltas) got no Dynamo design at all and surfaced as backlog.

**Fix:** Overriding a persistence recommendation requires **per-access-pattern
sign-off** (each hard pattern: accepted workaround named + ticketed), the judgment
reviewer re-runs on the *override*, the decision is revisitable after page specs exist,
and a `validate-access-patterns.mjs` fails any page-spec dataSource with no serving
index/strategy.

**Decision:** ___

---

### Issue #21 🔴 Client-side business logic is the least-extracted, most product-visible layer
**Problem:** For a BaaS source (Supabase), significant business rules live in React
hooks/dialogs, not SQL. The extraction sweeps SQL well but samples client code — so the
rules users actually feel are the ones most likely to vanish.

**Example:** The capacity gate (`available = current_estimate + Σ pending deltas`;
**block time logging** until estimate adjusted; self-approving `RequestMoreTimeDialog`) —
in zero artifacts. `EditTimeLogDialog`'s `time_logs.update()` — the entire UpdateTimeLog
op missing from catalog, card, and spec. Five `time_logs` read sites (WeeklyHoursBar,
useDailyLoggedWork, WeeklyBurnPanel…) — uncatalogued; the weekly-summary endpoint had to
be invented post-hoc (D5).

**Fix:** Mandatory **call-site census** for BaaS sources: every `.from().insert/update/
delete` and every read with its filter shape must map to a catalogued op (deterministic
grep + AST, machine-checkable); plus a dedicated client-side business-logic sweep over
hooks/dialogs (guards, computed gates, optimistic flows) feeding domain cards.

**Decision:** ___

---

### Issue #22 🟠 No DB-object census — triggers can simply vanish
**Problem:** Nothing reconciles the source's SQL objects against the extraction ledger.
Two of ~15 ticketing triggers were missed outright and appear in **zero** artifacts.

**Example:** `trim_estimates_on_done` (auto-trim estimates to actuals on completion +
audit row + 3-level attribution fallback — a cross-domain rule) and
`validate_ticket_epic` (epic must belong to ticket's project): zero grep hits across the
entire migration tree and specs.

**Fix:** Deterministic extraction gate: census every `CREATE FUNCTION / TRIGGER /
POLICY / VIEW` in source migrations → each must map to a ledger row (rule, endpoint, or
explicit skip-with-reason). Pure text-scan, no AI judgment.

**Decision:** ___

---

### Issue #23 🟠 The identity contract existed — in prose nothing consumed
**Problem:** The actor-resolution linchpin (`jwt email → team_members.id`; authUserId ≠
teamMemberId) WAS captured — in the identity-access card and RUNBOOK, as prose. The
domain-spec schema has no actor/identity slot, so none of the 11 specs carried it, and
nothing warned that the template's `@CurrentUser()` hands services the *auth subject*.
Every service persisted the wrong id class until a 6-service manual sweep.

**Example:** the 2026-07-01 IIdentityPort→/auth/me sweep; two competing `GET /auth/me`
surfaces; `auth_user_id` link-on-signup never wired. **Still open at HEAD:** comment
edit/delete and delete-time-log have no ownership checks — because ownership was never a
spec-level, generator-enforced concept.

**Fix:** Identity/actor section in the domain spec (which id class each persisted field
takes; what `@CurrentUser()` yields) + per-use-case `ownership:` that the generator turns
into actual guards + a lint that flags persisting the JWT subject into member-FK fields.

**Decision:** ___

---

### Issue #24 🟡 Gates that exist but aren't wired into the flow don't exist
**Problem:** `validate-migration-backend-readiness.mjs` — the exact punch-list tool that
would have caught "0 of 11 clients, 0 of ~89 hooks" — shipped with the template, is
wired as `pnpm migrate:check:backend`, is referenced in the docs… and **was never run**.
The gap was found days later by an ad-hoc 7-analyzer audit.

**Fix:** Every validator runs *automatically* at its phase boundary (orchestrator
invokes it; a phase without its validator's PASS output in the ledger is incomplete).
Guide rule: a gate that requires a human to remember it is documentation, not a gate.

**Decision:** ___

---

## THE MISSING KEYSTONE (developer proposal, 2026-07-02)

### Issue #25 🔴 The verified mock is never leveraged — no executable acceptance spec
**Problem:** We invest heavily in Gate #1 (Storybook for the source, a deterministic
fixture-seeded mock, human-verified completeness) — and then use it only for screenshots
and DOM dumps. Nothing converts the *verified running source* into an executable
behavioral contract for the target. Every gate we have checks structure; none proves
"clicking the button does the thing, for the right role, and it persists."

**Example:** Under the current gates, the target sprint page passed parity while: bulk
actions were no-ops, the detail sheet was unreachable, non-PMBA access was ungated, and
"create sprint" persisted nothing in wire mode (0 of 11 API clients existed). One
acceptance scenario — "as PMBA, create sprint → list+1 → reload → still there; as member
→ read-only" — fails on every one of those defects.

**Fix (new step: `/migrate-derive-acceptance`, after Gate #1):**
1. AI derives per-route scenarios from the verified mock + route cards + api catalog:
   features, interactions, access matrix (route × role), data effects.
2. **Self-validation loop: each scenario is executed against the SOURCE mock via
   Playwright; only PASSING scenarios are admitted** (kills hallucinated tests).
3. Output: neutral scenario YAML (given/when/then + access rules) compiled to Playwright
   for both apps — doubles as the human-readable feature/user-story/access-list artifact
   (**Gate #1.5**: developer reviews the feature list, not YAML internals).
4. **Stage A** — suite runs against target after `/migrate-page --mock` (UI +
   interactions + optimistic data effects). **Stage B** — same suite after `--wire` +
   backend, now asserting persistence (reload → still there) and access control
   (**this is Gate #2.5, the backend parity gate**).
5. Fail → machine-readable punch list (scenario/step/expected/actual) → re-dispatch the
   owning builder → re-run failed scenarios only → loop until green or N rounds.
6. Coverage tie-in: every route-card interaction, every role, every exposed CRUD op must
   have a scenario — a gap is a deterministic FAIL (connects to #1/#21).
7. **Known blind spot:** the mock bypasses server-side behavior (DB triggers like
   `trim_estimates_on_done` don't run in it). Those come from the DB-object census (#22)
   as backend-level scenarios replayed against the target API in Stage B.
8. The suite graduates into the app's permanent E2E regression baseline — not throwaway
   migration tooling.

Complements (does not replace) the composition gates: behavior suite = "translated
enough and correctly"; composition/reuse gates (#5/#7) = "built the right way".

**Confirmed derivation strategy (discussed 2026-07-02):**
- **Preferred: boot the real source locally** — Docker + the source's own migrations
  (old-st-flow: `supabase start` + `db reset` on the 79 migrations; config.toml already
  present), fixtures seeded via a service-role script, one auth user per role. Embedded
  DB logic (triggers/RPCs/RLS) then runs for real and scenarios observe it.
- **DB container matrix:** Postgres/Supabase + MySQL + MSSQL (`mcr.microsoft.com/mssql/
  server`) are easy; Oracle via `gvenzl/oracle-free`. Legacy sources whose logic lives
  only in a running DB get a **DDL-export step** (`DBMS_METADATA.GET_DDL` /
  `mssql-scripter` / `pg_dump --schema-only`) — the export becomes Tier-A evidence,
  feeds the census (#22), and replays into the container (free compile check).
  Non-runnable objects (DB links, agent jobs, CLR) are flagged, never silently skipped.
- **Fallback ladder when the source DB can't run locally:** (1) local seeded stack →
  (2) remote dev/staging instance → (3) **mock + SQL census**: all client-observable
  scenarios stay fully concrete (self-validated on the mock); server-rule scenarios are
  marked `inferred` (expected values from reading DDL, optionally re-observed by making
  the mock seam emulate the catalogued rules) → (4) no DDL at all = dark zone → flagged
  manual-QA list. Note Stage B always runs against the TARGET's own local stack, so real
  persistence/access verification of the translation survives even at level 3.
- **3rd-party auth (Google/GitHub OAuth) is not a blocker:** OAuth is the front door;
  the app consumes sessions/JWTs. Locally: create per-role test users via the auth
  admin API, mint sessions programmatically, reuse via Playwright `storageState` per
  role; a fake OIDC server (mock-oauth2-server/Dex/Keycloak) only if provider-specific
  data matters. RLS/role behavior is identical — policies key off JWT claims, not the
  provider. Provider-data dependencies (avatar sync, org checks) are integrations →
  mock adapter + census entry.

**Decision:** ___

---

## Suggested fix order (for discussion)

Scope note: we are fixing the **workflow** (commands, agents, skills, schemas,
validators, guide) — not remediating the current output.

| Priority | Fixes | Theme | Why |
|---|---|---|---|
| **1** | #16 + #4 (domain-spec v2 + page-spec v2) | **Raise the schema ceilings** | Both halves lose most information at the card→YAML hop; every builder reads only the YAML. Until the schemas can carry aggregates/rules/auth/endpoints (BE) and composition trees/interactions (FE), everything else patches symptoms |
| **2** | #17 + #24 (client-common wiring stage; auto-run all validators) | **Close the workflow holes** | The two purely-mechanical failures: a layer nobody builds, and gates nobody runs. Cheapest fixes, biggest single gaps |
| **3** | #1 + #2 + #21 + #22 (leaf-coverage gate; low-confidence blocks; call-site census; DB-object census) | **Fix the denominator** | Deterministic extraction completeness — file lists, call sites, SQL objects. FE extraction was the #1 FE loss; client-side logic + missed triggers were the real BE extraction misses |
| **4** | #5 + #7 (primitive map → generated composedOf → composition-parity gate) | **Generate, don't transcribe** | Parts lists derived by AST + mapping table instead of LLM reading; then hard-gate built code against them |
| **5** | #8 + #19 + #23 (wiring/callback checks; contract-vs-op-catalog validator; identity/ownership in spec) | **Verify correctness, not existence** | Kills the dead-feature, wrong-contract, and wrong-id classes |
| **6** | **#25** + #11 + #12 + #18 (executable acceptance spec from the verified mock; behavior capture/verify; auto-repair loop; backend parity Gate #2.5) | **Prove behavior** | The keystone: source-validated scenarios run against the target in mock mode (Stage A) and wired mode (Stage B/Gate #2.5), failures looping back to builders automatically. #11/#18 largely become implementation details of #25 |
| **7** | #3, #6, #9, #10, #13, #14, #15, #20 | **Process hygiene** | Deferral tickets, per-spec promotion, builder input diet, model tiering, override sign-off, no bookkeeping PASSes |
