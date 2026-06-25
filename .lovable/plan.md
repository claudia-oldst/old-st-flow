## Current state

`supabase/functions/generate-acceptance-criteria/index.ts` sends only `model` + `messages` to the Lovable AI Gateway — no `temperature`, `top_p`, or `max_tokens`. Gemini's defaults apply (temperature ≈ 1.0, no output cap), which is more creative and unbounded than appropriate for testable acceptance criteria.

## Change

Single file edit: `supabase/functions/generate-acceptance-criteria/index.ts`. Add three fields to the chat-completions request body:

```ts
body: JSON.stringify({
  model: "google/gemini-3-flash-preview",
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 600,
  messages: [ ... ],
}),
```

### Why these values

- **`temperature: 0.3`** — low enough that regenerations on the same ticket produce near-identical, grounded criteria, with only minor phrasing variation. Avoids the looser, more inventive output Gemini gives at its default ~1.0.
- **`top_p: 0.9`** — safety cap on the sampling pool; complements the low temperature.
- **`max_tokens: 600`** — caps output at roughly 8–12 bullet points / ~450 words. Acceptance criteria for a single ticket should comfortably fit; this prevents runaway lists, repeated bullets, or hallucinated extra sections while leaving headroom for a thorough ticket. (Raise to 800 if you'd prefer more slack.)

No prompt changes, no model change, no UI change, no other files touched.

## Confirm before I apply

- Temperature: **0.3** (proposed) — or 0.2 stricter / 0.4 looser?
- Max tokens: **600** (proposed) — or 800 for more headroom?