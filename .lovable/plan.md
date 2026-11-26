# Log time via JSON on My Timelogs

## Wireframe

### 1. Split "Log time" button
```text
My Timelogs                                   [ + Log time | v ]
                                                         |
                                              +----------------------+
                                              | {} Log via JSON...   |
                                              +----------------------+
```

### 2. Paste window
```text
+------------------------------------------------------+
| Log time via JSON                                [x] |
|------------------------------------------------------|
| [                                                  ] |
| [  [ { "project": "Cousteau",                      ] |
| [      "tickets": ["COU-934", "COU-519"],          ] |
| [      "date": "2026-11-26",                       ] |
| [      "start time": "09:00",                      ] |
| [      "end time": "10:30",                        ] |
| [      "reason": "Sprint planning" } ]             ] |
| [                                                  ] |
|  ! Line 4: not valid JSON   (shown only on error)    |
|                                  [Cancel] [Continue] |
+------------------------------------------------------+
```
The window stays open with a message if the JSON can't be read; it closes once it's valid.

### 3. Draft rows stacked on the page (same row as today)
```text
My Timelogs                                   [ + Log time | v ]
+------------------------------------------------------------------------+
| [Cousteau  v] [COU-934 v] [Sprint planning   ] [26 Nov] [1h][30m] [Save] [x] |
+------------------------------------------------------------------------+
| [Cousteau  v] [COU-519 v] [Sprint planning   ] [26 Nov] [1h][30m] [Save] [x] |
+------------------------------------------------------------------------+
| [Amber     v] [Choose.. v] [QA review        ] [25 Nov] [2h][ 0m] [Save] [x] |   <- ticket missing: pick it
+------------------------------------------------------------------------+
| [Choose..  v] [Choose.. v] [                 ] [Today ] [  ][   ] [Save] [x] |   <- fields skipped: fill in
+------------------------------------------------------------------------+

  ... existing time logs list below ...
```
- One row per ticket: an entry with `"tickets": [a, b]` becomes two rows.
- Start/end times fill hours and minutes automatically.
- Project names use the best match: "Cousteau" picks "Project Cousteau"; acronyms like "COU" also work.
- Skipped or unrecognised fields are left blank — never an error.
- Save logs that one row and removes it; x discards it. No "Save all".

## Technical details
- Frontend only, no database change. Rows reuse the existing inline log row and save through the normal logging flow (permissions, estimate-revision prompts unchanged).
- Accepts a single object or an array; field names matched loosely (`ticket`/`tickets`, `reason`/`note`/`description`, `h`/`m`, `start time`/`end time`).
- Projects best-matched among the user's projects (exact, then acronym, then case-insensitive contains/word match, ignoring "Project" prefix; ties left blank); tickets matched and ticket number (e.g. COU-934); unmatched values stay blank.
- New parser in its own small module with tests.
