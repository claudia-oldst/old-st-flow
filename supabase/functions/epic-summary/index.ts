// AI-generated client-friendly justification for an epic's estimate change.
// Returns { draft: string }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChangeInput {
  ticket: string;
  discipline: string;
  delta: number;
  reason?: string | null;
}

interface Body {
  epic_name: string;
  project_name: string;
  delta_hours: number;
  original_hours: number;
  current_hours: number;
  changes: ChangeInput[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as Body;
    if (!body?.epic_name) {
      return new Response(JSON.stringify({ error: "epic_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const changesBlock = (body.changes ?? [])
      .slice(0, 30)
      .map(
        (c) =>
          `- ${c.ticket} (${c.discipline}): ${c.delta > 0 ? "+" : ""}${c.delta}h${c.reason ? ` — ${c.reason}` : ""}`,
      )
      .join("\n");

    const direction =
      body.delta_hours > 0 ? "increased" : body.delta_hours < 0 ? "decreased" : "unchanged";

    const userPrompt = `Project: ${body.project_name}
Epic: ${body.epic_name}
Original estimate: ${body.original_hours}h
Current estimate: ${body.current_hours}h
Change: ${body.delta_hours > 0 ? "+" : ""}${body.delta_hours}h (${direction})

Underlying ticket changes:
${changesBlock || "(none recorded — explain the delta in general terms)"}

Write a short, client-friendly paragraph (2–4 sentences, plain prose, no bullet points, no headings) that explains why the estimate ${direction}. Group related causes, avoid jargon and ticket IDs, and keep a calm, professional tone. Do not invent specifics that aren't supported by the inputs.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You write short, calm, client-facing notes for a software project portal. Avoid jargon, never invent details, and keep responses to 2–4 plain prose sentences.",
            },
            { role: "user", content: userPrompt },
          ],
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const draft: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("epic-summary error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
