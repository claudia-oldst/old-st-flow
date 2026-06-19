# Login (`/login`)

**Source:** `src/pages/Login.tsx` · **Public route** (no auth gate)

## Purpose
Sole entry point for unauthenticated users. Authenticates via Google OAuth restricted to the `@old.st` Google Workspace domain.

## Behaviour
- On mount, if a user is already in `useCurrentUser`, redirects to `/`.
- While `authLoading` is true, renders a centered "Loading…" placeholder.
- "Continue with Google" calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin, queryParams: { hd: "old.st", prompt: "select_account" } } })`.
- Button is disabled and shows "Redirecting…" while the OAuth handshake is in flight. On error, the loading state is cleared (no toast — Supabase surfaces the failure on the redirect URL).

## UI
- Centered card: `oldst-logo.png`, heading "Sign in", subtitle pointing to `@old.st`.
- Footer note: "Access is granted by a PMBA in Admin → Team members."

## Dependencies
- `supabase.auth.signInWithOAuth`
- `useCurrentUser` (`src/store/currentUser.ts`) for current session + `authLoading`
- Asset: `src/assets/oldst-logo.png`

## Notes
- Domain restriction (`hd: "old.st"`) is a Google hint, not a hard gate — actual access control lives in `RequireAuth` + `team_members`/`user_roles`.
