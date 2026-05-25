# Protect Your Business — Security/Legal/AI Audit

Produce a single CSV (`/mnt/documents/audit-protect-your-business.csv`) of findings across the three "Protect Your Business" categories, written in plain English for a non-technical owner, all severity levels included.

## Scope

**In scope**
- Frontend: `src/` (React + Vite + TS, Supabase client, TanStack Query, dnd-kit)
- Backend: 5 Supabase edge functions (`archive-project`, `daily-logoff-summary`, `epic-summary`, `generate-acceptance-criteria`, `rehydrate-project`, `vault-download-url`)
- Supabase database: RLS policies, security definer functions, exposed columns (16 tables already in context)
- Repo hygiene: `.env`, secrets, dependencies, licenses

**Out of scope**
- Performance/scalability, DevOps, code quality, UX — user chose "Protect Your Business only"
- Changes to the codebase — this is a read-only audit

## Audit passes

1. **Exposed Secrets** — grep `src/` and `supabase/functions/` for hardcoded keys, tokens, JWT secrets, service-role key usage in frontend; check `.env`/`.gitignore`; check for credentials in committed configs.
2. **AuthN/AuthZ (frontend routes & components)** — review `RequireAuth`, `AuthProvider`, role gates (PMBA vs project member), any admin routes, client-side-only authorization.
3. **AuthN/AuthZ (edge functions)** — every edge function: does it verify the JWT? does it re-check role server-side? does it accept user-supplied `user_id`/`project_id` without re-authorization?
4. **RLS deep review** — walk each of the 16 tables. Confirm policies are not overly permissive (`true`), confirm INSERT/UPDATE/DELETE coverage, look for `current_team_member_id()` / `current_is_pmba()` / `current_can_access_ticket()` definer functions and verify they have `search_path` set and aren't bypassable.
5. **Sensitive storage** — PII in `team_members.email`, project `client_portal_hash`, `vault_storage_path`; check whether `client_portal_hash` is a hash or a token; check `localStorage`/`sessionStorage` use for tokens; Supabase storage bucket policies if any.
6. **Input validation** — forms (auth, ticket create/edit, comments, time logs, epics): zod schemas? length/charset limits? edge function inputs validated? user-controlled HTML via `dangerouslySetInnerHTML`?
7. **Database security** — Supabase linter run; check for SECURITY DEFINER funcs without `search_path`; check public-readable tables (`statuses`, `team_members`, `status_derivation_rules` are read-all-authed — confirm that's intentional and doesn't leak PII like emails).
8. **Backup/recovery** — `vault_storage_path` / `rehydrate-project` / `archive-project` indicate an archival flow; document whether automated backups exist, whether restore is tested, whether vault checksums are verified.
9. **Legal/Compliance** — search for privacy policy/ToS links, consent UI, data deletion path, retention policy; scan `package.json` for copyleft (GPL/AGPL/LGPL) licenses; check for unattributed assets in `src/assets/`.
10. **AI-specific risks** — `generate-acceptance-criteria`, `epic-summary`, `daily-logoff-summary` likely call Lovable AI Gateway/LLM: check prompt-injection surface (user-controlled ticket titles/comments fed into prompts), rate limiting, error handling, cost caps, whether ticket/PII content is sent to third-party models, whether AI output is rendered without sanitization.

## Tools used (read-only)

- `rg` / `code--view` for code scanning
- `supabase--linter` for DB warnings
- `supabase--read_query` to inspect policies, definer functions, and any role tables not in the schema dump
- `code--dependency_scan` for vulnerable npm packages
- `secrets--fetch_secrets` to list configured backend secrets (names only) for cross-reference with edge function code

## Deliverable

A single CSV at `/mnt/documents/audit-protect-your-business.csv` with header:

```text
Issue,Risk Level,Category,Subcategory,Specific Concern,Details,Example,User Result / Impact,Best practice
```

- One row per finding, plain-English Details/Impact/Best practice.
- Risk Level: Critical / High / Medium / Low.
- Category: Security & Access Control | Database & Data | Legal & Compliance | AI-Specific Risks.
- Subcategory matches the bullets in the original prompt (e.g. "Exposed Secrets", "Missing Authentication", "RLS").
- Rows ordered by Risk Level (Critical → Low).
- Skipped subcategories (no findings) noted in a short chat summary, not in the CSV.
- Closing chat message: artifact tag + count of findings by severity + top 3 issues to fix first.

## Out of this plan

- No code changes. If you want fixes for any finding afterward, that's a separate build-mode task.
