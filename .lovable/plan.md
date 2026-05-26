## Update CI to Node.js 24

GitHub is deprecating Node.js 20 for JavaScript-based Actions. The warning comes from `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/upload-artifact@v4` still running on their bundled Node 20 runtime.

### Changes to `.github/workflows/ci.yml`

1. **Opt the action runtimes into Node 24** by adding a workflow-level env var:
   ```yaml
   env:
     FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
   ```
   This silences the deprecation warning for `checkout`, `setup-node`, and `upload-artifact` without changing action versions (v4 is still the latest major; no v5 exists yet).

2. **Bump the project's Node version from 20 to 24** in both jobs' `setup-node` step:
   ```yaml
   node-version: '24'
   ```
   This keeps the tooling aligned with the runner default and avoids future surprises.

### Out of scope
- No application code changes.
- No dependency upgrades — current packages run fine on Node 24.
- Edge functions job (Deno) is unaffected.