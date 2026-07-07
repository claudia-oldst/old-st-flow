# Screenshot Manifest — old-st-flow source mock

Captured against the booted mock (`npm run dev:mock` → `http://localhost:8081`) by
`capture.spec.ts` (Playwright, single browser, `--workers=1`). Each row emits BOTH
`{route}/{state}-{viewport}-{theme}.png` and `.dom.json`.

**Theme note:** the source app is **dark-only** (`:root` defines dark tokens, `color-scheme: dark`,
no `ThemeProvider`/`.dark` toggle). The planned `light` variant does not exist in the source, so
every row is captured in the app's native `dark` theme. Viewport: `desktop` (1440×900). See SPEC-DELTAS.md.

State fixture ids (real, from the live app):
- populated/many project (COU R1): `f77acac6-09f3-4da8-97e6-ec125afcbb22`
- empty project (DEM, 0 tickets): `36aa2c91-61e3-4098-9fc5-f3d41313852c`
- single project (DRA, 1 ticket): `8438996f-055d-4cb0-a1b6-7d8dfd58ac35`
- public portal hash: `c16bf94a8e01ac8e0da588e2426b4a19aa81e7d370742e4cb365e3a85ecaa6d6`

| route | state | viewport | theme | deep-link | wait-for |
| ----- | ----- | -------- | ----- | --------- | -------- |
| projects-list | many | desktop | dark | `/` | network-idle |
| project-tickets | many | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22` | network-idle |
| project-tickets | empty | desktop | dark | `/projects/36aa2c91-61e3-4098-9fc5-f3d41313852c` | network-idle |
| project-tickets | single | desktop | dark | `/projects/8438996f-055d-4cb0-a1b6-7d8dfd58ac35` | network-idle |
| change-requests-cr | populated | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22/change-requests-cr` | network-idle |
| estimate-revisions | default | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22/change-requests` | network-idle |
| sprints | populated | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22/sprints` | network-idle |
| sprints | empty | desktop | dark | `/projects/36aa2c91-61e3-4098-9fc5-f3d41313852c/sprints` | network-idle |
| health | populated | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22/health` | network-idle |
| client-portal-editor | populated | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22/client` | network-idle |
| my-work | default | desktop | dark | `/my-work` | network-idle |
| admin | populated | desktop | dark | `/admin` | network-idle |
| client-portal-public | populated | desktop | dark | `/h/c16bf94a8e01ac8e0da588e2426b4a19aa81e7d370742e4cb365e3a85ecaa6d6` | network-idle |
| login | default | desktop | dark | `/login` | network-idle |
| not-found | default | desktop | dark | `/this-route-does-not-exist` | network-idle |
| ticket-detail-sheet | open | desktop | dark | `/projects/f77acac6-09f3-4da8-97e6-ec125afcbb22` (click first ticket) | `[role=dialog]` |
