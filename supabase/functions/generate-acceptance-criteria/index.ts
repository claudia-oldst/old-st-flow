// AI-generated acceptance criteria for a single ticket, grounded in project context.
// Returns { draft: string }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  ticket_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticket_id } = (await req.json()) as Body;
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ticket, error: tErr } = await supabase
      .from("tickets")
      .select("id, project_id, formatted_id, title, ticket_type, version, epic_id")
      .eq("id", ticket_id)
      .maybeSingle();
    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: tErr?.message ?? "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: project }, epicRes, { data: siblings }] = await Promise.all([
      supabase.from("projects").select("name, acronym, client_name").eq("id", ticket.project_id).maybeSingle(),
      ticket.epic_id
        ? supabase.from("project_epics").select("epic_name").eq("id", ticket.epic_id).maybeSingle()
        : Promise.resolve({ data: null as { epic_name: string } | null }),
      supabase
        .from("tickets")
        .select("formatted_id, title, ticket_type, acceptance_criteria")
        .eq("project_id", ticket.project_id)
        .neq("id", ticket.id)
        .order("ticket_number", { ascending: true })
        .limit(40),
    ]);
    const epic = (epicRes as any)?.data ?? null;

    const siblingBlock = (siblings ?? [])
      .map((s: any) => `- ${s.formatted_id} [${s.ticket_type}] ${s.title}`)
      .join("\n");

    const examplesBlock = (siblings ?? [])
      .filter((s: any) => s.acceptance_criteria && String(s.acceptance_criteria).trim().length > 20)
      .slice(0, 3)
      .map((s: any) => `### ${s.formatted_id} — ${s.title}\n${s.acceptance_criteria}`)
      .join("\n\n");

    const userPrompt = `Project: ${project?.name ?? "(unknown)"}${project?.client_name ? ` (client: ${project.client_name})` : ""}
Epic: ${epic?.epic_name ?? "(none)"}
Ticket: ${ticket.formatted_id} [${ticket.ticket_type}]${ticket.version ? ` v${ticket.version}` : ""}
Title: ${ticket.title}

Other tickets in this project (for context):
${siblingBlock || "(none)"}

${examplesBlock ? `Examples of acceptance criteria already written for this project:\n\n${examplesBlock}` : ""}

Write acceptance criteria for the ticket above. Use Markdown. Prefer Given/When/Then bullet points or a short numbered checklist of testable conditions. Cover the happy path, key edge cases, and obviously implied UI/data states. Stay grounded in the inputs — do not invent unrelated features. Output only the criteria, no preamble.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write concise, testable acceptance criteria for software tickets. Use Markdown bullet lists with Given/When/Then style or numbered checklists. Be specific but never invent product details that aren't supported by the inputs.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
    console.error("generate-acceptance-criteria error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
