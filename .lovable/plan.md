# Client Portal — Wireframes

Two views share the same visual building blocks. The PMBA editor on the left adds controls; the public page is a read-only stripped-down version.

---

## A. PMBA Editor — `/projects/:id/client`

```text
┌─ ← All projects ─────────────────────────────────────────────────────────┐
│  [ACME]  Acme Rebuild  · Acme Corp                  [Export] [⚙] [👥 Client]│  ← "Client" CTA added
├──────────────────────────────────────────────────────────────────────────┤
│  Tickets   Change Requests   Health   ●Client                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Toolbar ─────────────────────────────────────────────────────────┐   │
│  │ As of: [📅 30 Apr 2026 ▾]   Status: ● Published 28 Apr           │   │
│  │ Public link: /h/k3n…q9   [Copy]   [Disable]   [▶ Publish to client]│  │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ Intro for client (markdown) ─────────────────────────────────────┐   │
│  │ ┌──────────────────┐  ┌────────────────────┐                     │   │
│  │ │ Edit             │  │ Preview            │                     │   │
│  │ │ We've completed  │  │ We've completed... │                     │   │
│  │ │ the auth flow…   │  │                    │                     │   │
│  │ └──────────────────┘  └────────────────────┘                     │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ Tickets ──┐ ┌─ Progress ─┐ ┌─ Hours ─────┐ ┌─ Cost (GBP) ──────┐   │
│  │   84       │ │  ██████░░  │ │ 312 / 410   │ │  £24,960          │   │
│  │ 12 ▢  9 ◐  │ │  62% done  │ │  76% burn   │ │  of £32,800       │   │
│  │ 63 ✓       │ │            │ │  ● healthy  │ │  rate £80/h       │   │
│  └────────────┘ └────────────┘ └─────────────┘ └───────────────────┘   │
│                                                                          │
│  ┌─ Discipline status ───────────────────────────────────────────────┐   │
│  │ FE  ████████████░░░░░░░░░░  18 done · 6 in-prog · 4 todo          │   │
│  │ BE  ██████████████░░░░░░░░  22 done · 5 in-prog · 3 todo          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ Estimate evolution ──────────────────────────────────────────────┐   │
│  │       hrs                                              ___ Actual │   │
│  │   500 ┤                                       ___,---'           │   │
│  │   400 ┤              ____------''''''                  Current   │   │
│  │   300 ┤────────────                                    Original  │   │
│  │       └────────────────────────────────────────────             │   │
│  │        Jan   Feb   Mar   Apr   ▲ as of                           │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─ Epics ───────────────────────────────────────────────────────────┐   │
│  │ ▾ Authentication              [4✓ 1◐ 0▢]   80h → 96h  +16h  £7.7k │   │
│  │   ┌────────────────────────────────────────────────────────────┐ │   │
│  │   │ Why estimate changed (visible to client)   [✨ Generate]   │ │   │
│  │   │ ┌──────────────────────────┐ ┌─────────────────────────┐  │ │   │
│  │   │ │ We expanded SSO scope to │ │ We expanded SSO scope…  │  │ │   │
│  │   │ │ cover Google + Azure…    │ │                         │  │ │   │
│  │   │ └──────────────────────────┘ └─────────────────────────┘  │ │   │
│  │   │ [✓] Include in client view              [↻ Regenerate]    │ │   │
│  │   └────────────────────────────────────────────────────────────┘ │   │
│  │ ▸ Onboarding                  [3✓ 2◐ 1▢]   60h → 60h   0h   £4.8k │   │
│  │ ▾ Billing                     [1✓ 3◐ 2▢]  120h →148h  +28h £11.8k │   │
│  │   … (summary block as above) …                                    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## B. Public Client View — `/h/:hash` (no TopBar, max-w 880px)

```text
┌──────────────────────────────────────────────────────────────────┐
│  [oldst]                              Acme Rebuild · Acme Corp   │
│                                       As of  30 April 2026       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  We've completed the authentication flow this sprint and are     │
│  now focused on the billing module ahead of the May launch.      │
│                                                                  │
│  ┌─ Tickets ────┐ ┌─ Progress ──┐ ┌─ Cost ──────────┐           │
│  │     84       │ │   ██████░░  │ │   £24,960       │           │
│  │  62% done    │ │   62%       │ │   of £32,800    │           │
│  └──────────────┘ └─────────────┘ └─────────────────┘           │
│                                                                  │
│  Frontend  ████████████░░░░  64% done                            │
│  Backend   ██████████████░░  72% done                            │
│                                                                  │
│  ── Epics ──────────────────────────────────────────────         │
│                                                                  │
│  Authentication                                  ● 100% done     │
│  4 done · 1 in progress                  96h  (orig 80h)  £7.7k  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ We expanded SSO scope to cover Google and Azure logins, │    │
│  │ which added roughly two days of work across the team.   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Onboarding                                      ◐ 50% done      │
│  3 done · 2 in progress · 1 to do        60h  (orig 60h)  £4.8k  │
│                                                                  │
│  Billing                                         ◐ 17% done      │
│  1 done · 3 in progress · 2 to do       148h  (orig 120h) £11.8k │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ We added support for VAT-inclusive pricing and an extra │    │
│  │ retry flow for failed payments at your request.         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ── Last updated 28 April 2026 ────────────────────              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Visual notes

- **Tiles**: glass surface, mono numerics, semantic health colors (`--health-good/warn/bad`) for the burn ring.
- **Cost tile**: only renders if `projects.rate_per_hour > 0`; uses `Intl.NumberFormat("en-GB", {style:"currency", currency:"GBP", maximumFractionDigits:0})`.
- **Status chips per epic**: reuse `DISCIPLINE_STATUS_COLOR`. ▢ todo · ◐ in progress · ✓ done.
- **Editor vs public**: the public page omits the toolbar, intro editor, evolution chart, and all controls. Same building blocks, same data shape from the RPC, just rendered without affordances.
- **Mobile**: tiles stack to a single column under 640px; epic rows wrap status chips below the title.

Approve and I'll proceed with the plan from the prior turn (migration + edge function + editor + public page).