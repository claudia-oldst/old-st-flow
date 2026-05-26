# Contributing

## Workflow

1. Pick up a ticket or open a discussion in chat first if the change is large.
2. Branch convention: handled by Lovable — every chat session is its own commit train. For external GitHub contributors, branch from `main` with `feat/`, `fix/`, `chore/` prefixes.
3. Keep PRs focused. One feature or one bug fix per PR.
4. Run the [quality gates](#quality-gates) before requesting review.
5. Get a review from someone who has touched the area before.

## Conventions

### TypeScript

- Strict mode is on. Don't add `any`; if you must, leave a `// TODO(narrow-type)` comment.
- Prefer `type` aliases over `interface` for non-extendable shapes.
- Import the Supabase row type from `src/types/domain.ts` (or extend it there), never inline `Database["public"]["Tables"]["x"]["Row"]`.

### React

- Functional components only. Default to small, focused components.
- Side effects: TanStack Query for server data, `useEffect` only for true side effects (subscriptions, DOM).
- Co-locate `*.test.tsx` next to the component.

### Styling

- Tailwind utility classes plus semantic tokens from `src/index.css` and `tailwind.config.ts`.
- Never hardcode colors. `bg-primary`, `text-foreground`, `border-hairline`, `bg-surface-2` — see the [Design system](../README.md#design-system) section.
- Variants via `class-variance-authority` (look at `src/components/ui/button.tsx` for the pattern).

### File size

Keep files under ~250 LOC. If a component grows past that, split it (subcomponents into a folder of the same name, hooks into `useX.ts`, types into `types.ts`).

### Forms

- React Hook Form + Zod resolver.
- Schema lives in `src/lib/schemas/<entity>.ts`.
- Surface validation errors via the `FormMessage` shadcn primitive.

### Data fetching

- Query keys: `[domain, scope, ...args]`. Example: `["tickets", projectId, filters]`.
- Mutations should invalidate the narrowest possible key set.
- Don't fetch in `useEffect`. Use a query hook.

### Database changes

- Ask the Lovable agent; it generates the migration. Don't write SQL files by hand.
- Past migrations are immutable. Fix-forward only.
- Every new table needs RLS enabled and policies for select/insert/update/delete as appropriate.
- Sensitive functions: `SECURITY DEFINER` only when needed, always with `set search_path = public`, and only grant `EXECUTE` to the roles that actually need it.

### Edge functions

- Every function verifies the caller's JWT first.
- Use the service-role client only after auth + role checks pass.
- Return `{ error: string }` with a non-2xx status for failures; the SPA expects this shape.
- Keep CORS in lockstep with the rest of the functions.

## Quality gates

Run before opening a PR:

| Gate           | Command                  | What it checks                              |
| -------------- | ------------------------ | ------------------------------------------- |
| Lint           | `npm run lint`           | ESLint (typescript-eslint, react-hooks)     |
| Typecheck      | `npx tsc --noEmit`       | Strict TypeScript across the SPA            |
| Tests          | `npm run test`           | Vitest suite (must stay green)              |
| Coverage       | `npm run test:coverage`  | v8 coverage; respects thresholds            |
| File-size cap  | manual                   | Keep files ≤ ~250 LOC; split when over      |
| Build          | `npm run build`          | Production build succeeds with no warnings  |

CI is not currently wired up in this repo; the Lovable build runs on every commit and surfaces failures.

## Adding tests

See the [Testing](../README.md#testing) section of the README for the patterns. Quick recipe:

```tsx
import { renderWithProviders } from "@/test/utils";
import { setSupabaseHandler } from "@/test/mocks/supabase";

it("renders the ticket title", () => {
  setSupabaseHandler({ table: "tickets", op: "select" }, () => ({
    data: [{ id: "1", title: "Hello" }],
    error: null,
  }));
  const { getByText } = renderWithProviders(<TicketList projectId="p1" />);
  expect(getByText("Hello")).toBeInTheDocument();
});
```

Prefer pulling pure logic out of hooks and testing it directly — it's faster and more durable.

## Commit messages

Conventional Commits encouraged but not enforced:

```
feat(tickets): add priority chip to TicketCard
fix(client-portal): handle empty epic list
chore(deps): bump @dnd-kit/core to 6.4.0
```

## When in doubt

Read the existing code in the area you're changing. The patterns are consistent; mirror them. If something feels off, open a discussion before introducing a new pattern.
