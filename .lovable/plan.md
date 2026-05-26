
## Goal

Run the full quality gate automatically on every push and every pull request, to any branch, via GitHub Actions. Failures show up as red checks in GitHub next to each commit/PR.

## Prerequisite

This project must be connected to GitHub (Plus menu → GitHub → Connect project). CI lives in the repo, not in Lovable. Lovable's auto-commits will trigger the workflow just like any other push.

## What gets added

One new file: `.github/workflows/ci.yml`.

No changes to source code, configs, or `package.json` scripts — everything CI runs (`npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run test:coverage`, `npm run build`, `deno test`) already exists.

## Workflow design

Two parallel jobs so feedback is faster and failures are easier to attribute:

1. **frontend** (Ubuntu, Node 20)
   - `npm ci`
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run test:coverage` (covers `npm run test` and enforces the 25%/50% thresholds in `vitest.config.ts`)
   - `npm run build`
   - Upload `coverage/` as an artifact for inspection

2. **edge-functions** (Ubuntu, Deno latest stable)
   - `deno test --allow-net --allow-env supabase/functions/`

Triggers:

```yaml
on:
  push:
    branches: ['**']
  pull_request:
    branches: ['**']
```

Concurrency group per ref so rapid Lovable commits cancel in-flight runs instead of piling up.

## Technical details

- Uses `actions/checkout@v4`, `actions/setup-node@v4` with `cache: 'npm'`, `denoland/setup-deno@v1`, `actions/upload-artifact@v4`.
- Node 20 LTS matches the Vite 5 / Vitest 3 toolchain.
- No secrets required — edge-function tests use the pure `helpers.ts` units, which don't hit Supabase. If we later add integration tests that need `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, we'll add them as GitHub repo secrets and inject via `env:`.
- Branch protection (optional, configured in GitHub UI, not in code): mark both jobs as required status checks on `main` to block merges on red.

## Out of scope

- Deploying edge functions on green (can be a follow-up workflow).
- Posting coverage as a PR comment (can add `davelosert/vitest-coverage-report-action` later if useful).
- Caching Deno deps (small win; skip for now).

## After implementation

1. Confirm the project is connected to GitHub.
2. Make any commit — the Actions tab will show the run. Expect ~2–4 min total.
3. If anything fails, share the failing job's log and I'll fix forward.
