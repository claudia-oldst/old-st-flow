# AGENTS.md

- The Thalamus intake uses `supabase/functions/_shared/intake.ts` for screenshot/recording re-hosting and the first bot comment; recordings use the existing private ticket attachment shape and player — why: no duplicate storage or media UI.
- Feedback tickets (`ticket_type = 'Feedback'`) use negative `ticket_number` and `FB-n` labels; `before_ticket_insert` assigns the real number on conversion — why: they must not consume the project sequence.
- Any new report/RPC reading tickets must exclude `ticket_type = 'Feedback'` — why: unconverted feedback must not affect lists, health, portal or billing.
