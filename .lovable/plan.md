## Goal
Make `src/integrations/supabase/client.ts` read Supabase URL + anon key from Vite env vars, with the current hardcoded values kept as fallbacks.

## Why this improves maintainability
- **Single source of truth per environment.** `.env` already defines `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; today they are silently ignored. After the change, staging / preview / local builds can point at a different Supabase project without editing source.
- **No code change per environment.** CI/preview deploys stop requiring a code edit + commit just to swap credentials.
- **Fallback preserves current behavior.** Fresh clones with no `.env` keep working exactly as today — zero runtime impact, zero UX change.
- **No new abstractions, no new files, no dependency changes.** Vite's `import.meta.env` is already typed via the existing `src/vite-env.d.ts` reference to `vite/client`.

## Change (only file touched)

`src/integrations/supabase/client.ts` — replace the two constant assignments:

```ts
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://vkelhdyulmdhdgerzunu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZWxoZHl1bG1kaGRnZXJ6dW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzIxMTcsImV4cCI6MjA5MjYwODExN30.hDh-GUqgexJVkb5Zqcl6t-OSRNMyQ4it7K6R9jAS9F8";
```

Everything else in the file is unchanged: the auto-generated header comment, the `createClient<Database>(...)` call, auth options (`storage: localStorage`, `persistSession: true`, `autoRefreshToken: true`), and the exported `supabase` singleton.

## Guardrails
- No other files touched. All ~30+ call sites that `import { supabase } from "@/integrations/supabase/client"` are unaffected.
- No changes to `src/integrations/supabase/types.ts` (generated).
- No changes to `.env` or `.env.example`.
- Edge functions continue to use `Deno.env.get(...)` — out of scope.
- `tsc` must pass with zero new errors.

## Verification
1. App loads, login persists, existing Supabase queries and realtime subscriptions work (spot-check `ProjectWorkspace`, `TicketsList`, `useRealtimeReload`).
2. Optional sanity check: temporarily set `VITE_SUPABASE_URL` to a bogus value in `.env`, restart dev server, confirm requests target the override (then revert).

## Out of scope
- Removing the hardcoded fallback entirely (would break fresh clones).
- Throwing on missing env vars.
- Refactoring the client to a factory or moving auth options.