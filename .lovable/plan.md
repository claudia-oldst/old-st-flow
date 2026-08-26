# Group time logging on My Timelogs

Short answer: yes. The platform already has group logging — the Stop Group Timer flow splits one elapsed duration across several tickets, lets you tweak each ticket's minutes, flags tickets that would exceed their estimate, and opens the estimate request dialog inline. Making the inline row's ticket picker multi-select lets the manual entry reuse exactly that behaviour.

## Wireframe

Single ticket — unchanged one-line row:

```text
┌ glass card ─────────────────────────────────────────────────────────────────────────┐
│ [Project ▾] [Tickets: DRA-041 ▾] [What you did…        ] [26 Aug 📅] [09:00] [2]h [30]m [Save] [x] │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Two or more tickets — the row stays, an allocation panel drops below it:

```text
┌ glass card ─────────────────────────────────────────────────────────────────────────┐
│ [Project ▾] [Tickets: 3 selected ▾] [What you did…    ] [26 Aug 📅] [09:00] [2]h [00]m [Save] [x] │
│                                                                                     │
│  Split 120m across 3 tickets            Allocated 120m · Remaining 0m  [Even split]  │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │ DRA-041  Checkout refinements                          [ 40 ] min          🗑   │ │
│  │ DRA-047  Cart totals rounding                          [ 40 ] min          🗑   │ │
│  │ DRA-052  Payment retry  ⚠ OVER  Adjust                 [ 40 ] min          🗑   │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Ticket dropdown (multi-select):

```text
┌ Tickets ─────────────────────────┐
│ 🔍 search…                       │
│ ☑ DRA-041  Checkout refinements  │
│ ☑ DRA-047  Cart totals rounding  │
│ ☑ DRA-052  Payment retry         │
│ ☐ DRA-060  Admin filters         │
└──────────────────────────────────┘
```

"Adjust" on an over-capacity ticket opens the existing Request More Time dialog; Save stays disabled until it is resolved or the ticket is removed.

## How it will work


1. The Ticket control on the inline row becomes a multi-select (checkbox list with search, showing `TICKET-ID + title`). Picking one ticket keeps today's single-line behaviour unchanged.
2. Once two or more tickets are selected, an allocation panel opens beneath the row — the same list used when stopping a group timer:
   - Total duration comes from the hours/minutes fields on the row.
   - Minutes are split evenly across the selected tickets and can be edited per ticket, with an "Even split" button and a live "allocated vs remaining" counter. Save is blocked until the allocation matches the entered duration.
   - Each ticket can be removed from the group without clearing the whole draft.
3. Capacity is checked per ticket. Any ticket whose allocation would exceed its available estimate is highlighted with a warning and a "Request more time" action that opens the existing estimate request dialog for that ticket and discipline. Nothing is saved while a ticket is still over — so no logs or data points are lost; you resolve the estimate first, then save.
4. On save, one `time_logs` row is written per ticket (source `manual`), sharing the note, date and optional start time. Backlog tickets are promoted to the first active status as they are today, and the success toast reports total hours across N tickets.

## Notes and constraints

- Discipline stays per-group, as with the group timer: it is derived from the selected tickets, and the discipline selector appears only when more than one option applies. Tickets whose disciplines are incompatible (for example a Project ticket mixed with a Standard FE ticket) cannot be grouped, and the picker will disable them once the group's discipline is set.
- No database or RLS changes are needed.

## Technical detail

- `useInlineLogDraft.ts`: `ticketId` becomes `ticketIds: string[]`; load details via the existing ticket detail loader for each; keep per-ticket minute allocations in state; reuse `evenSplit` and `useTicketCapacityByIds` / `capacityFor` from `src/features/timelog`; insert an array of `time_logs` in one call.
- `InlineLogRow.tsx`: swap the ticket `Select` for a multi-select popover; render the allocation panel with the existing `stop-group/RowsList` pattern (minutes input, overflow highlight, remove) and mount `RequestMoreTimeDialog` for the flagged ticket.
- Existing single-ticket logging, editing via `EditTimeLogDialog`, grouping and filters on the page are untouched.
