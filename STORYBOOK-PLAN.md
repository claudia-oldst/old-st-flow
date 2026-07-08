---
plan: source-stories
source: old-st-flow
status: approved
generated: 2026-06-24
---

# Storybook Stories Plan — old-st-flow

## Inputs (interview answers — EXECUTE resumes from these; do NOT re-interview)

- **sourceRoot:** `d:\old-st-flow`
- **componentsFolder:** `src/components/ui` (auto-detected; 48 primitives)
- **storybookVersion:** auto-detect → **not installed** → bootstrap **Storybook 8** with `@storybook/react-vite`
- **overwrite:** `skip` (no existing story files present)
- **scope:** `all`
- **includeComposites:** `yes` (feature composites under `src/components/`)
- **bootstrapStorybook:** `yes` — Storybook is currently **absent**. EXECUTE Phase B.0 installs `storybook@^8.6 @storybook/react@^8.6 @storybook/react-vite@^8.6 @storybook/addon-essentials@^8.6 @storybook/test@^8.6` (with `NODE_ENV=development --include=dev`) and writes `.storybook/main.ts`, `.storybook/preview.tsx`, and a Supabase client alias-mock (`.storybook/mocks/supabase.ts`).

### Decorator stack (Phase B.0.5) — required for data-driven composites

App shell wraps providers; stories will mirror them via a global decorator:
`QueryClientProvider (fresh client, retry:false)` → `MemoryRouter` → `TooltipProvider`, plus `import "../src/index.css"`, dark-by-default background.
The Supabase client (`@/integrations/supabase/client`) is alias-mocked to a chainable/thenable no-op so on-mount queries never hit the real backend. Auth store (`useCurrentUser`) defaults to no user → role/user-gated queries stay `enabled:false` (no network); `TopBar` will get a per-story store-seed decorator since it renders user-dependent UI.

## Build manifest

### Primitives — `src/components/ui/` (action: **generate**, all)

| Component | Path | Has story | Est. stories |
| --- | --- | --- | --- |
| Accordion | accordion.tsx | ✗ | Default + Variants |
| AlertDialog | alert-dialog.tsx | ✗ | Default (open state) |
| Alert | alert.tsx | ✗ | Default + Variants |
| AspectRatio | aspect-ratio.tsx | ✗ | Default |
| Avatar | avatar.tsx | ✗ | Default + States |
| Badge | badge.tsx | ✗ | Default + Variants |
| Breadcrumb | breadcrumb.tsx | ✗ | Default |
| Button | button.tsx | ✗ | Default + Variants + States (+ icon) |
| Calendar | calendar.tsx | ✗ | Default (single) + Variants (range) |
| Card | card.tsx | ✗ | Default + Domain (project card) |
| Carousel | carousel.tsx | ✗ | Default |
| Chart | chart.tsx | ✗ | Default (time series) |
| Checkbox | checkbox.tsx | ✗ | Default + States |
| Collapsible | collapsible.tsx | ✗ | Default |
| Command | command.tsx | ✗ | Default (grouped palette) |
| ContextMenu | context-menu.tsx | ✗ | Default |
| Dialog | dialog.tsx | ✗ | Default (open) |
| Drawer | drawer.tsx | ✗ | Default (open) |
| DropdownMenu | dropdown-menu.tsx | ✗ | Default |
| Form | form.tsx | ✗ | Default (useForm wrapper) |
| HoverCard | hover-card.tsx | ✗ | Default |
| InputOTP | input-otp.tsx | ✗ | Default |
| Input | input.tsx | ✗ | Default + States |
| Label | label.tsx | ✗ | Default |
| Menubar | menubar.tsx | ✗ | Default |
| NavigationMenu | navigation-menu.tsx | ✗ | Default |
| Pagination | pagination.tsx | ✗ | Default |
| Popover | popover.tsx | ✗ | Default |
| Progress | progress.tsx | ✗ | Default + States |
| RadioGroup | radio-group.tsx | ✗ | Default |
| Resizable | resizable.tsx | ✗ | Default |
| ScrollArea | scroll-area.tsx | ✗ | Default |
| Select | select.tsx | ✗ | Default |
| Separator | separator.tsx | ✗ | Default + Variants (orientation) |
| Sheet | sheet.tsx | ✗ | Default (open) |
| Sidebar | sidebar.tsx | ✗ | Default (fullscreen, SidebarProvider) |
| Skeleton | skeleton.tsx | ✗ | Default |
| Slider | slider.tsx | ✗ | Default + States |
| Sonner | sonner.tsx | ✗ | Default (toaster host) |
| Switch | switch.tsx | ✗ | Default + States |
| Table | table.tsx | ✗ | Default (domain rows) |
| Tabs | tabs.tsx | ✗ | Default |
| Textarea | textarea.tsx | ✗ | Default + States |
| Toast | toast.tsx | ✗ | Default + Variants |
| Toaster | toaster.tsx | ✗ | Default (host) |
| ToggleGroup | toggle-group.tsx | ✗ | Default + Variants |
| Toggle | toggle.tsx | ✗ | Default + Variants + States |
| Tooltip | tooltip.tsx | ✗ | Default |

**Primitives: 48 generate.**

### Composites — `src/components/` (action per row)

| Component | Path | Action | Est. stories | Notes |
| --- | --- | --- | --- | --- |
| MemberAvatar | MemberAvatar.tsx | generate | Default + Variants (sizes) + Stack | Pure presentational (`MemberAvatar` + `MemberAvatarStack`). Prop-driven. |
| ListPagination | ListPagination.tsx | generate | Default + Variants (windowing/ellipsis) | Pure presentational; `onChange` stub. |
| WeeklyHoursBar | WeeklyHoursBar.tsx | generate | Default | Data-driven (useQuery+Supabase); needs decorators. Seed query cache `["weekly-hours",…]`. |
| TopBar | TopBar.tsx | generate | Default | Heavy: router + auth store + Supabase + feature imports. Needs MemoryRouter + per-story `useCurrentUser` seed. layout: fullscreen. |
| ErrorBoundary | ErrorBoundary.tsx | generate | Default (fallback UI) | Class component; render with a throwing child to show fallback. |
| TimerSync | TimerSync.tsx | **skip** | — | Returns `null` — no rendered UI; side-effect only. |
| NavLink | NavLink.tsx | **skip** | — | Thin `react-router` NavLink wrapper; no visual variants. |

**Composites: 5 generate, 2 skip.**

## Totals

- **53 components to generate** (48 primitives + 5 composites)
- **2 to skip** (`TimerSync`, `NavLink` — no visual surface)
- **0 to enrich** (no existing stories)
- Bootstrap Storybook 8 + decorators + Supabase mock as the first EXECUTE step.

## Approval

Set `status: approved` (or reply `approve`) to authorize generation. Edit the manifest above to exclude components or change the overwrite policy before approving.
