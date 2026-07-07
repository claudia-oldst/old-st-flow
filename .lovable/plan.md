## Goal
Let users log time in hours and/or minutes without doing decimal math. Storage stays in decimal hours (no DB changes).

## Wireframe — Log Time modal (manual entry tab)

```text
┌────────────────────────────────────────────────────────┐
│  ⏱  Log time                                           │
│  OLD-123 · Fix header layout                           │
│  Used 2h / 8h                                          │
├────────────────────────────────────────────────────────┤
│  [ Live timer ] [ Manual entry ]                       │
│                                                        │
│  Discipline:  ( Frontend )  ( Backend )                │
│                                                        │
│  Duration                                              │
│  ┌──────┐       ┌──────┐                               │
│  │  1   │ h     │  30  │ m       = 1.5h                │
│  └──────┘       └──────┘                               │
│                                                        │
│  Note (optional)                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│                            [ Cancel ]  [ Log hours ]   │
└────────────────────────────────────────────────────────┘
```

Field behavior:
- **h** input: integer ≥ 0, step 1, placeholder `0`, ~64px wide.
- **m** input: integer 0–59, step 5, placeholder `0`, ~64px wide. Clamped to 0–59 on blur (60 → 1h 0m auto-carry is out of scope; we just clamp).
- Live preview `= 1.5h` to the right in dimmed mono. Hidden when both fields empty.
- At least one field > 0 required. Otherwise Save disabled.
- Overflow warning + "Adjust estimate" flow unchanged — reads the computed decimal.

Same layout inside the Edit Time Log dialog; on open, an existing `1.5` splits into `1` / `30`.

## Implementation
1. New `src/features/timelog/log-time/DurationInput.tsx` — the two fields + live preview. Props: `{ h: string; m: string; onChange(h, m): void; invalid?: boolean }`.
2. Helpers in `src/features/timelog/utils.ts` + tests in `utils.test.ts`:
   - `hoursMinutesToDecimal(h, m) → number`
   - `decimalToHoursMinutes(dec) → { h, m }` (minutes rounded to nearest whole minute)
3. `useLogTime.ts`: swap the single `hours` string for `{ h, m }`; `handleManualLog` uses the helper.
4. `EditTimeLogDialog.tsx`: initialize from `decimalToHoursMinutes(log.hours)`; save path mirrors #3.
5. `LogTimeModal.tsx`: render `<DurationInput/>` in place of the current Hours input.

## Out of scope
- DB schema, RLS, edge functions.
- Timer-based logging.
- Estimate inputs (FE/BE/Project original estimate) stay hours-only decimals.

## Verification
- Unit tests: `hoursMinutesToDecimal("1","30") === 1.5`, `("0","45") === 0.75`, `("2","0") === 2`; `decimalToHoursMinutes(1.25) === {h:1,m:15}`; round-trip for 0.5, 1.5, 2.75.
- Manual: log `0h 30m`, `1h 0m`, `1h 30m`, `0h 45m` → `time_logs.hours` = 0.5 / 1 / 1.5 / 0.75. Edit a 1.5h log → dialog opens with `1` and `30`.
