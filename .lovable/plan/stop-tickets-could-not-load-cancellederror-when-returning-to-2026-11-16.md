# Stop "Tickets could not load — CancelledError" when returning to Tickets

## What is happening
The error in the screenshot is not a real failure. Tickets download in batches of 200. If you leave the Tickets tab before the download finishes (e.g. jump to Health, Client or another project), the app stops the download. When you come back, the stopped download is remembered as an "error" and the page doesn't try again by itself, so you see the red box until you press Retry.

## The fix (no database changes)
1. **Keep downloading when you leave.** Leaving the tab will no longer stop the ticket download. It finishes quietly in the background, so the list is ready when you come back.
2. **Never show "Cancelled" as an error.** If a download is ever stopped, the page treats it as "not finished yet" and starts again automatically, instead of showing the red box.
3. **Keep tickets in memory longer.** Each project's ticket list stays cached for 30 minutes (now 5). Going back to a project you opened recently shows the list straight away and refreshes it quietly.
4. **Resume after real errors.** If the last attempt failed or stopped part-way, returning to the tab tries again automatically, keeping the tickets already loaded.
5. **One quiet automatic retry** for real network blips before the red box appears. Retry stays available.

## Technical details
- `useProjectTickets.ts`: don't pass the react-query `signal` to `fetchProjectTickets` on unmount (still abort on explicit reload), set `gcTime: 30min`, `retry: (n, e) => n < 1 && !isCancelledError(e)`, use `refetchOnMount: (q) => q.state.status === "error" || q.state.data?.complete !== true`, and filter `CancelledError`/`AbortError` out of the returned `error`.
- Add a test in `ticketLoadingHooks.test.tsx`: unmount mid-download, remount, and expect no error and a complete list.
