# Login screen

**Route:** `/login` — public

The only screen an unauthenticated user can reach. Anything else redirects here.

## Layout
A single centered card on a dark background:
- Old St Labs logo at the top.
- Heading "Sign in".
- Subtitle: "Use your **@old.st** Google account."
- Primary button: **Continue with Google** (full width).
- Footer line in muted text: "Access is granted by a PMBA in Admin → Team members."

## Interactions
- **Continue with Google** opens Google's OAuth consent, pre-filtered to the `old.st` workspace and forcing the account-picker (so users on multiple Google accounts can pick the right one). The button label switches to "Redirecting…" and is disabled until the redirect happens.
- If the user is already signed in when they land here, they are bounced straight to the Projects screen.
- While the app is still figuring out whether a session exists, the card is replaced with a centered "Loading…" line.

## Errors
OAuth failures (wrong domain, cancelled, etc.) re-enable the button silently — Google's own error UI handles the messaging on its redirect.
