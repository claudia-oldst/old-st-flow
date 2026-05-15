// AI-generated end-of-day standup summary for the dev team.
// Input: { projects: [{ name, tickets: [{ formatted_id, title, hours, notes }] }] }
// Output: { summary: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketInput {
  formatted_id: string;
  title: string;
  hours: number;
  notes: string[];
}
interface ProjectInput {
  name: string;
  tickets: TicketInput[];
}
interface Body {
  projects: ProjectInput[];
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
    const projects = (body?.projects ?? []).filter(
      (p) => p && p.tickets && p.tickets.length > 0,
    );

    if (projects.length === 0) {
      return new Response(
        JSON.stringify({ summary: "Logging off:\n- No work logged today.\nGood night!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const block = projects
      .map((p) => {
        const lines = p.tickets
          .slice(0, 30)
          .map(
            (t) =>
              `  • ${t.formatted_id} (${t.hours}h) ${t.title}${t.notes?.length ? ` — notes: ${t.notes.join(" | ")}` : ""}`,
          )
          .join("\n");
        return `Project: ${p.name}\n${lines}`;
      })
      .join("\n\n");

    const userPrompt = `Today's logged work, grouped by project. Each ticket has its title and any notes the dev wrote on the time log.

${block}

Write an end-of-day standup note in EXACTLY this format:

Logging off:
- {Project name}: {summary}
- {Project name}: {summary}
Good night!

STRICT rules:
- One bullet per project, in the order given.
- Base each summary ONLY on the ticket titles and the time-log notes shown. Do NOT invent technologies, features, fixes, file names, or any detail that is not explicitly present.
- If notes exist, prefer them as the source of truth. If only titles exist, paraphrase them in dev shorthand.
- Each summary is just a few words of dev shorthand (roughly 4–8 words). Lowercase, comma-separated fragments, no full sentences, no trailing punctuation, no emojis, no ticket IDs, no hour counts.
- If there is genuinely nothing meaningful to say for a project, write "misc work".
- Output the block exactly — no preamble, no markdown fences.`;

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
                "You write terse end-of-day dev standup notes. You never invent details — only paraphrase what's in the supplied ticket titles and time-log notes. Output is dev shorthand, a few words per project.",
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
      console.error("daily-logoff-summary AI error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-logoff-summary error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
