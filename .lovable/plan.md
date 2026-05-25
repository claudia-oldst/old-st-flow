# Google SSO via @old.st with team_members-driven roles

## Approach

The app already has a `team_members` table with `email`, `name`, `avatar_color`, and `role`. Today the "current user" is just a manual dropdown (`UserPicker` in `TopBar`). We'll keep `team_members` as the single source of truth for identity/role, and add real Google auth on top, mapping the signed-in Google account to a `team_members` row by email.

PMBAs continue managing team in the Admin → Team tab (add user, set role). Only emails on the `team_members` list — and only `@old.st` Google accounts — can use the app.

## What changes

### 1. Supabase setup (one-time, manual by user)
- In Supabase Dashboard → Authentication → Providers → enable **Google**, paste Client ID/Secret from Google Cloud.
- Set Site URL + Redirect URLs to the Lovable preview + published URLs.
- (I'll give exact steps in chat after the plan is approved.)

No `profiles` table is needed — `team_members` already plays that role.

### 2. New `/login` page
- Single "Continue with Google" button → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin }})`.
- After redirect, an auth callback effect:
  - If `user.email` doesn't end in `@old.st` → sign out + show "Use your old.st Google account".
  - Look up `team_members` row where `email = user.email`:
    - **Found** → set as current user, route to `/`.
    - **Not found** → sign out + show "Your account isn't on the team yet — ask a PMBA to add you."

### 3. Auth provider / route gating
- New `AuthProvider` in `src/App.tsx` that:
  - Sets up `supabase.auth.onAuthStateChange` **before** calling `getSession()` (per Supabase best practice).
  - On every session change, re-runs the @old.st + team_members lookup and updates `useCurrentUser`.
  - On sign-out or failed lookup, clears `useCurrentUser` and redirects to `/login`.
- Wrap all existing routes (`/`, `/projects/*`, `/admin`, `/my-work`) in a `<RequireAuth>` guard. `/h/:hash` (public client portal) and `/login` stay public.

### 4. Replace the `UserPicker` dropdown
- `TopBar` currently has a "Switch user (v1)" dropdown — replaced with the real signed-in user's avatar + name and a **Sign out** menu item.
- `useCurrentUser` keeps the same shape (`user: TeamMember | null`) so the rest of the codebase (project role checks, assignment slots, time logs, etc.) keeps working unchanged.

### 5. Role enforcement
- Role still comes from `team_members.role` (global) + `project_members.role` (per-project), exactly as `useProjectRole` already does — no changes needed there.
- PMBA-only UI (Admin → Status rules, project settings, etc.) keeps using the existing `isPMBA` / `canManageTickets` checks.

### 6. RLS (deferred, called out)
Current RLS on `team_members`, `tickets`, `projects`, etc. is fully permissive (`true`). Real Google auth means we *could* tighten policies (e.g. only allow writes when `auth.uid()` matches a team member), but that requires linking `team_members.id` to `auth.users.id`, which is a bigger migration touching every assignee/time-log/comment row. **Out of scope for this change** — I'll flag it as a follow-up once SSO is live and stable.

## Technical details

- **Files added**
  - `src/pages/Login.tsx` — Google sign-in screen, branded with logo + coral CTA.
  - `src/features/auth/AuthProvider.tsx` — session listener, email-domain + team_members lookup, redirects.
  - `src/features/auth/RequireAuth.tsx` — route guard.
  - `src/features/auth/useAuthSession.ts` — small hook exposing `{ session, status }`.

- **Files edited**
  - `src/App.tsx` — wrap routes in `<AuthProvider>` + `<RequireAuth>`, add `/login` public route.
  - `src/components/TopBar.tsx` — replace `UserPicker` with signed-in user menu (avatar, name, Sign out).
  - `src/store/currentUser.ts` — keep store, drop the persisted "manually picked user" semantics (set only by AuthProvider).

- **Allowed-domain check** runs client-side in AuthProvider. (Server-side enforcement would need a database webhook or auth hook — can be added later if needed.)

## What I'll need from you after approval
1. Confirm I should proceed (no code changes happen in plan mode).
2. Then enable Google provider in the Supabase dashboard — I'll link you straight to the page and list the exact Client ID / redirect URL values to paste.
