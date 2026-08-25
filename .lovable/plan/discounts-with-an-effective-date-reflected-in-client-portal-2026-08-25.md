# Discounts with an effective date, reflected in client portal copy

Two connected changes: discounts get a user-chosen "applies from" date, and the AI-generated epic note for the client portal takes in-scope discounts into account.

## 1. Effective date on discounts

- New `applied_at` date on each discount, chosen with the standard calendar picker in the Create discounts dialog (defaults to today, one date per row).
- Existing discounts keep working: their applied date is backfilled from the date they were created, so nothing changes visually today.
- The discounts list shows "Applies from" instead of "Created", and the date is editable inline alongside hours and reason.
- Everywhere the portal is frozen to an as-of date, discounts are included only when their applied date falls on or before that cutoff. So a discount raised in August but dated 31 July shows on a portal frozen at 31 July, and is excluded from an August-only view.
- The Month-to-date card counts discounts by applied date rather than creation date.

## 2. Discounts visible on the public portal

Right now only signed-in team members can read discount rows, so a client opening the public link sees the totals without the discounts applied. As part of this change the portal data functions will return the in-scope discounts (epic, discipline, hours, reason, applied date) alongside the rest of the payload, and both the editor preview and the public link will read discounts from that payload. This makes the preview and the client view identical.

## 3. Discounts in the generated epic copy

- The AI assist button on each epic summary will send the epic's in-scope discounts (hours, discipline, reason, applied date) along with the estimate change data it already sends.
- The prompt is extended so that, when discounts exist, the note explains the goodwill/credit in plain client-facing language and states the hours credited — still 2-4 sentences, UK English, no ticket IDs.
- When an epic has no discounts in scope, the generated copy is unchanged from today.

## Technical notes

- Migration: `ALTER TABLE public.epic_discounts ADD COLUMN applied_at timestamptz NOT NULL DEFAULT now()`, backfilled with `created_at`. Keeps existing RLS and grants.
- Redefine `get_project_portal_preview` and `get_client_portal`: filter `epic_discounts` by `applied_at <= cutoff` (and `>= date_trunc('month', cutoff)` for the `month` block), and add a top-level `discounts` array to the returned JSON.
- `src/features/client-portal/types.ts`: add `PortalDiscount` and `discounts` to `PortalPayload`.
- `PortalView.tsx` / `ClientPortalEditor.tsx` / `ClientPortalPublic.tsx`: source discounts from `payload.discounts` rather than `useEpicDiscounts`.
- `applyDiscounts.ts`: change `discountsBefore` to key off `applied_at`; update its unit test.
- `CreateDiscountsDialog.tsx`: add a shadcn Popover + Calendar per row (`pointer-events-auto` on the calendar), `applied_at` added to `CreateDiscountInput` and the zod row schema; `useEpicDiscounts.ts` inserts and updates it.
- `DiscountsList.tsx`: swap the Created column for an editable Applies-from date.
- `EpicSummaryEditor.tsx`: pass a `discounts` array for the epic (already filtered to the portal cutoff) into the `epic-summary` invoke body.
- `supabase/functions/epic-summary/index.ts`: accept `discounts`, render a sanitised discount block inside the existing `<<<DATA>>>` guard, and extend the instruction line to cover crediting.
