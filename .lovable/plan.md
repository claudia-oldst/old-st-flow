## Problem

The `frontend` job fails on the **Install dependencies** step (`npm ci`). `npm ci` is strict: it errors out if `package-lock.json` doesn't exactly match `package.json`. Lovable manages installs with `bun`, so the committed `package-lock.json` drifts and `npm ci` rejects it.

(The tests themselves pass — 129/129 — and coverage is a separate, later concern.)

## Fix

Update `.github/workflows/ci.yml` to install with `npm install` instead of `npm ci` in the **frontend** job. `npm install` reconciles the lockfile against `package.json` rather than failing on drift.

Exact change in the frontend job:

```yaml
- name: Install dependencies
  run: npm install --no-audit --no-fund --prefer-offline
```

Flags:
- `--no-audit` / `--no-fund` — quieter logs
- `--prefer-offline` — uses the Node setup cache when possible

Everything else stays: lint, typecheck, `npm run test:coverage`, build, coverage artifact, Deno job.

## Why not regenerate the lockfile instead

We could commit a fresh `package-lock.json` and keep `npm ci`, but Lovable's next `bun add` will desync it again and CI will break on the following push. Using `npm install` matches how this project actually manages dependencies.

## Heads-up: coverage thresholds will still fail

Once install is fixed, the next failure will be `npm run test:coverage` because the global thresholds in `vitest.config.ts` (25% lines/statements/functions, 50% branches) are above the actual coverage (~7.76% lines). That's a separate decision (lower thresholds, drop them, narrow `include`, or write more tests). I'll surface it as a follow-up after the install fix lands so we can confirm the install change works in isolation.

## Out of scope

- Coverage threshold changes (separate decision).
- Switching CI to bun (possible later, but `npm install` is a smaller change).
