## Move Acceptance Criteria into its own tab

In `src/features/tickets/TicketDetailSheet.tsx`:

1. Change the `TabsList` from 2 to 3 columns and add an "Acceptance" trigger. Order: **Acceptance | Discussion | Detail**.
2. Add a new `<TabsContent value="acceptance">` that renders the existing `<AcceptanceCriteria />` component (moved out of the discussion tab).
3. Remove `<AcceptanceCriteria />` from the discussion tab so that tab now contains only `<TicketComments />` (drop the `hairline-t pt-6` wrapper since there's no longer a section above it).
4. Keep `defaultValue="detail"` so existing behavior is preserved, or switch to `"acceptance"` — I'll keep `"detail"` as default unless you prefer otherwise.

No other files change.
