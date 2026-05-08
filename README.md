# old.st — Project Delivery Workspace

A delivery-management workspace for agencies and product teams: track tickets across disciplines (frontend, backend, project), capture estimate changes and change requests, log time, and publish a polished, read-only portal to clients — all in one place.

Built for [old.st](https://old.st) and powered by [Lovable](https://lovable.dev) + Lovable Cloud (Supabase).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Project scripts](#project-scripts)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Data model & security](#data-model--security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Features

- **Projects & workspaces** — multi-project shell with per-project board, list, health, team, and settings views.
- **Tickets** — quick-add rows, bulk import from CSV/XLSX, detail sheet with markdown acceptance criteria, attachments, and comments.
- **Two-tier status model** — per-discipline status (FE/BE/Project: `todo`, `in_progress`, `done`) automatically derives the overall ticket status. PM/BAs can override at the project level.
- **Estimates & change requests** — track original vs current vs actual hours per discipline, log every estimate change with a reason, and roll deltas up to epics. Dedicated CR tickets for client-approved scope changes.
- **Time tracking** — start/stop ticket timers (synced across tabs via Zustand), log time manually, and roll up actuals per discipline.
- **Project health** — estimate evolution charts, burn-up trends, and per-epic deltas with date-range controls.
- **Client portal** — PMBA editors compose an "as-of" snapshot (intro, per-epic narrative, included/excluded toggles) and publish to a hashed public URL (`/h/:hash`). Clients see a read-only dashboard and approve/reject change requests.
- **Vault** — archive completed projects to cold storage and rehydrate on demand (powered by Supabase Edge Functions).
- **Admin** — manage statuses, status-derivation rules, and team membership.
- **Realtime** — Supabase Realtime keeps boards, tickets, and the client portal in sync without manual refresh.
- **AI assists** — generate acceptance criteria and epic summaries via the Lovable AI Gateway.

## Tech stack

- **Framework**: React 18, Vite 5, TypeScript 5
- **Styling**: Tailwind CSS v3 + custom HSL design tokens, shadcn/ui (Radix primitives), `class-variance-authority`
- **State & data**: TanStack Query v5, Zustand, React Hook Form + Zod
- **Backend**: Lovable Cloud (Supabase) — Postgres, Auth, Storage, Realtime, Edge Functions (Deno)
- **Drag & drop**: `@dnd-kit`
- **Charts**: Recharts
- **CSV/XLSX**: PapaParse, SheetJS (`xlsx`)
- **Markdown**: `react-markdown` + `remark-gfm`
- **Toasts**: Sonner
- **Testing**: Vitest, React Testing Library, jsdom
- **Tooling**: ESLint 9 (typescript-eslint), SWC via `@vitejs/plugin-react-swc`

## Architecture

```text
┌──────────────────────────────────────────────────────┐
│  React SPA (Vite + TS)                               │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Pages     │→ │  Features    │→ │  UI (shadcn) │  │
│  └────────────┘  └──────────────┘  └──────────────┘  │
│         │              │                             │
│         │              ├── TanStack Query (server)   │
│         │              └── Zustand     (client)      │
│         ▼                                            │
│  ErrorBoundary wraps every route                     │
└──────────────────────────────────────────────────────┘
                        │
                        ▼ supabase-js (RLS-enforced)
┌──────────────────────────────────────────────────────┐
│  Lovable Cloud (Supabase)                            │
│  • Postgres + RLS         • Realtime channels        │
│  • Auth (email/OAuth)     • Storage (attachments)    │
│  • Edge Functions: archive-project, rehydrate-       │
│    project, epic-summary, generate-acceptance-       │
│    criteria, vault-download-url                      │
└──────────────────────────────────────────────────────┘
```

Routing (see `src/App.tsx`):

| Path                 | Page                  | Notes                                 |
| -------------------- | --------------------- | ------------------------------------- |
| `/`                  | `Projects`            | Project list + create                 |
| `/projects/:id/*`    | `ProjectWorkspace`    | Board, tickets, health, team, portal  |
| `/my-work`           | `MyWork`              | Personal cross-project ticket queue   |
| `/admin`             | `Admin`               | Statuses, rules, members              |
| `/h/:hash`           | `ClientPortalPublic`  | Read-only client view (no auth)       |

## Getting started

### Prerequisites

- Node 18+ (or Bun)
- A Lovable Cloud (Supabase) project — auto-provisioned when you open this app in Lovable

### Local development

```sh
# 1. Install
npm install        # or: bun install

# 2. Configure env (auto-populated by Lovable Cloud — see .env)
#    VITE_SUPABASE_URL=...
#    VITE_SUPABASE_PUBLISHABLE_KEY=...
#    VITE_SUPABASE_PROJECT_ID=...

# 3. Run the dev server
npm run dev        # Vite at http://localhost:8080
```

> **Note:** `VITE_SUPABASE_PUBLISHABLE_KEY` is the public anon key and is safe to commit. Never check in service-role keys — store them as Supabase Edge Function secrets via the Lovable Cloud UI.

## Project scripts

| Script               | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start the Vite dev server                   |
| `npm run build`      | Production build to `dist/`                 |
| `npm run build:dev`  | Development-mode build (source maps, etc.)  |
| `npm run preview`    | Preview the production build locally        |
| `npm run lint`       | Run ESLint across the project               |
| `npm run test`          | Run the Vitest suite once                   |
| `npm run test:watch`    | Vitest in watch mode                        |
| `npm run test:coverage` | Vitest with v8 coverage (HTML + text)       |

## Project structure

```text
src/
├── components/          # App-level shared components (TopBar, ErrorBoundary, ...)
│   └── ui/              # shadcn primitives — do not edit ad hoc
├── features/            # Feature modules grouped by domain
│   ├── admin/           # Status rules admin
│   ├── board/           # Kanban board + DnD
│   ├── change-requests/ # CR tickets and epic CR cards
│   ├── client-portal/   # PMBA editor + public portal view
│   ├── comments/        # Ticket comments + attachments
│   ├── epics/           # Epic selectors + queries
│   ├── estimates/       # Estimate changes + epic deltas
│   ├── health/          # Project health, evolution charts
│   ├── project/         # Settings, export, links
│   ├── statuses/        # Discipline status hooks
│   ├── team/            # Membership + roles
│   ├── tickets/         # List, detail sheet, quick-add, CSV import
│   ├── timelog/         # Timers + manual log
│   └── vault/           # Archive / rehydrate
├── hooks/               # Cross-feature hooks (realtime, mobile, toast)
├── integrations/
│   └── supabase/        # Generated types + browser client
├── lib/
│   ├── schemas/         # Zod schemas for user input (ticket, comment, ...)
│   ├── types.ts         # Domain types
│   └── utils.ts         # cn(), formatting helpers
├── pages/               # Route entry points
├── store/               # Zustand stores (currentUser, timer)
├── test/                # Vitest setup, fixtures, mocks, renderWithProviders
│   ├── fixtures/        # Typed factory functions (tickets, ...)
│   ├── mocks/           # Reusable test doubles (supabase chainable mock)
│   └── utils.tsx        # renderWithProviders (QueryClient + Router)
└── types/domain.ts      # Convenience aliases over Database row types

supabase/
├── functions/           # Edge Functions (Deno)
└── config.toml
```

## Design system

The app is dark-mode only, brand-matched to **old.st**.

- **Surface**: deep navy `hsl(227 33% 16%)`
- **Primary CTA**: coral `#F76C5E` → `hsl(5 90% 67%)`
- **Accent**: gold `#FFCD71` (logo)
- **Type**: Poppins (display / `.font-display`, h1–h4), Inter (body), JetBrains Mono (numerics)

Rules:

1. **Never** hardcode colors in components. Always use semantic tokens defined in `src/index.css` and `tailwind.config.ts` (`bg-primary`, `text-foreground`, `border-hairline`, `bg-surface-2`, ...).
2. All colors are **HSL** in the token layer.
3. Build component variants with `class-variance-authority` rather than ad-hoc `className` strings.
4. Use shadcn primitives from `src/components/ui/` — extend via variants, don't fork.

## Data model & security

- **Roles** live in a dedicated `user_roles` table with an enum (`admin`, `pmba`, `member`, ...). They are **never** stored on `profiles` or any business table.
- A `SECURITY DEFINER` SQL helper (`public.has_role(user_id, role)`) is used inside RLS policies to avoid recursion.
- Every table has **RLS enabled**. Mutations are gated by membership and role checks.
- The public client portal is reached only by an unguessable `client_portal_hash` and exposes a curated RPC payload (`get_client_portal`) — the underlying tables remain locked down.
- User input is validated with **Zod** (`src/lib/schemas/`) before hitting Supabase: tickets, comments, project settings, client portal copy.
- Every routed page is wrapped in an **ErrorBoundary** so a render failure in one feature can't white-screen the whole app.

## Testing

```sh
npm run test           # one-shot
npm run test:watch     # watch mode
npm run test:coverage  # v8 coverage → ./coverage/index.html
```

Vitest + React Testing Library + jsdom. Tests live next to the unit under test as
`*.test.ts(x)`. Shared helpers live in `src/test/`:

- `src/test/fixtures/` — typed factories (`makeTicket`, `withFeAssignee`, ...).
- `src/test/mocks/supabase.ts` — chainable mock of `supabase-js`. Tests replace
  the real client via `vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"))`
  and drive responses with `setSupabaseHandler({ table, ops }) => { data, error }`.
  Recorded chains are exposed via `recordedChains` for asserting the exact
  payload sent to Supabase.
- `src/test/utils.tsx` — `renderWithProviders` wraps the UI in a fresh
  `QueryClientProvider` and `MemoryRouter`.

What is covered today:

- **Zod schemas** — ticket, comment, project, client portal.
- **Pure utilities & helpers** — `applyFilters`, `buildChangeRequestGroups`,
  `evenSplit`, `evaluateRule`, `makeHash`, `relativeTime`, `useDebounced`,
  `buildEpicTrendSeries`.
- **Estimate logic** — `useEpicCR`, `useEpicChange`.
- **Feature hooks** with mocked Supabase — `useBulkAssign` (payload shape +
  guards), and the supabase mock pattern is reusable for the rest.
- **Export pipeline** — `runExportProject` (mocked `xlsx` + Supabase) verifies
  sheet composition and approved-delta math.
- **Presentational components** — `Stat`, `StatusBadge`, `ChipGroup`,
  `ProjectLinksEditor`, `Ring`, `ProfitabilityPill`, plus the `ErrorBoundary`
  fallback.

Coverage thresholds (in `vitest.config.ts`) are intentionally a floor, not a
ceiling — raise them as more hooks gain tests. Out of scope for this layer:
end-to-end browser tests (Playwright is the planned next step).

When adding a feature, co-locate `*.test.ts(x)` next to the unit, prefer pure
helpers extracted from hooks for the bulk of assertions, and use the supabase
mock for hook-level integration where mutation payloads are the contract.

## Deployment

This project is built and deployed via **Lovable**.

- **Publish**: open the project in [Lovable](https://lovable.dev), click **Share → Publish**.
- **Custom domain**: Project → Settings → Domains (requires a paid plan). Docs: <https://docs.lovable.dev/features/custom-domain>.
- **Supabase migrations & Edge Functions**: managed by Lovable Cloud — schema changes are applied via the Lovable agent, and edge functions in `supabase/functions/` deploy automatically.

## Contributing

1. Read the design system rules above before touching UI.
2. Keep features inside `src/features/<domain>/`. Cross-feature primitives go in `src/components/` or `src/lib/`.
3. Prefer small, focused components and hooks. Split files that grow past ~250 lines.
4. Validate user input with Zod; tighten `any` whenever you touch a file.
5. Add or update tests for non-trivial logic.

### Quality gates (run before every PR)

| Gate           | Command                  | What it checks                              |
| -------------- | ------------------------ | ------------------------------------------- |
| Lint           | `npm run lint`           | ESLint (typescript-eslint, react-hooks)     |
| Typecheck      | `npx tsc --noEmit`       | Strict TypeScript across the SPA            |
| Tests          | `npm run test`           | Vitest suite (must stay green)              |
| Coverage       | `npm run test:coverage`  | v8 coverage; respects thresholds            |
| File-size cap  | manual                   | Keep files ≤ ~250 LOC; split when over      |
| Build          | `npm run build`          | Production build succeeds with no warnings  |

---

Built with ♥ on [Lovable](https://lovable.dev).
