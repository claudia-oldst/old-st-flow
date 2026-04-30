## What will change

The cards in your screenshot — for example:

- Account Payment Details
- Account Profile
- Admin Dashboard
- Admin Notifications

are the **per-epic cards under the "Epics" section** in `PortalView.tsx`.

I will update those cards so they only render when the epic has been explicitly saved with:

```ts
included === true
```

That means:

- toggled **Show to client ON** → card appears
- toggled **Show to client OFF** → card hidden
- never toggled / no saved visibility row → card hidden

## Exact code change

In `src/features/client-portal/PortalView.tsx`, change the per-epic card filter from the current fallback-visible logic:

```ts
.filter((e) => e.total_tickets > 0 && (e.included ?? true))
```

to explicit opt-in only:

```ts
.filter((e) => e.total_tickets > 0 && e.included === true)
```

## What stays unchanged

- The **Estimate trend over time** graph will still include all epics, as requested earlier.
- The **Estimate Change Detail** section will continue to only show included epics that have an estimate change and PMBA description.
- PMBAs will still be able to edit/toggle epics in the editor where those controls already exist.

## Important note

Right now, the toggle UI only exists for epics listed in **Epics with scope changes**. So epics that are not in that editor list will not appear in the client portal unless they already have a saved `included = true` record. This matches your latest instruction: these cards should only show if toggled to show.