# AGENTS.md

- The Thalamus intake uses `supabase/functions/_shared/intake.ts` for screenshot/recording re-hosting and the first bot comment; recordings use the existing private ticket attachment shape and player — why: no duplicate storage or media UI.
- Feedback tickets (`ticket_type = 'Feedback'`) use negative `ticket_number` and `FB-n` labels; `before_ticket_insert` assigns the real number on conversion — why: they must not consume the project sequence.
- Any new report/RPC reading tickets must exclude `ticket_type = 'Feedback'` — why: unconverted feedback must not affect lists, health, portal or billing.
- Feedback triage reuses the shared overall status, filter, grouping and bulk controls while hiding discipline status, assignment and timers — why: manage feedback without treating it as live development.

- Ticket list rows omit acceptance criteria and parent titles; hydrate them with dedicated detail queries and block criteria editing until loaded — why: small downloads must never overwrite unloaded content.
- Full ticket collections load progressively in 200-row pages with per-page retry/cancellation; defer realtime refresh until downloading finishes — why: slow connections must retain progress instead of restarting.
- Epic review cards (Change Requests, Estimate Revisions) share `_shared/estimate-ui/EpicReviewCard` for layout/pagination; each feature supplies totals, chart data, columns and rows — why: one card UI, feature-specific data logic.
- Cross-feature UI (e.g. `MultiSelectFilter`) lives under `src/features/_shared/` — why: avoid features importing from each other.
- Client portal Type/Epic/Version filters are optional `_f_*` args on every portal RPC (via `portal_filter_match`) and live in the URL — why: numbers are aggregated server-side and shared links must reproduce the view.
