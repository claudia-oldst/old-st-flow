import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id || typeof project_id !== "string") {
      return new Response(JSON.stringify({ error: "project_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load project + cutoff
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id,name,client_name,client_visibility_cutoff,rate_per_hour")
      .eq("id", project_id)
      .maybeSingle();
    if (pErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cutoff = project.client_visibility_cutoff ?? new Date().toISOString();

    // Aggregate inputs
    const { data: tickets } = await admin
      .from("tickets")
      .select(
        "id,formatted_id,title,current_fe_estimate,current_be_estimate,current_project_estimate,original_fe_estimate,original_be_estimate,original_project_estimate,actual_frontend_hours,actual_backend_hours,actual_project_hours,status_id,statuses:statuses(category)"
      )
      .eq("project_id", project_id);

    const { data: changes } = await admin
      .from("ticket_estimate_changes")
      .select(
        "discipline,previous_hours,new_hours,delta,reason,decided_at,created_at,ticket:tickets!inner(project_id,formatted_id)"
      )
      .eq("status", "approved")
      .eq("ticket.project_id", project_id)
      .lte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(80);

    const { data: notes } = await admin
      .from("time_logs")
      .select("note,discipline,hours,logged_at,ticket:tickets!inner(project_id,formatted_id)")
      .eq("ticket.project_id", project_id)
      .lte("logged_at", cutoff)
      .not("note", "is", null)
      .order("logged_at", { ascending: false })
      .limit(60);

    const totals = (tickets ?? []).reduce(
      (acc, t: any) => {
        acc.curr +=
          Number(t.current_fe_estimate) +
          Number(t.current_be_estimate) +
          Number(t.current_project_estimate);
        acc.orig +=
          Number(t.original_fe_estimate) +
          Number(t.original_be_estimate) +
          Number(t.original_project_estimate);
        acc.act +=
          Number(t.actual_frontend_hours) +
          Number(t.actual_backend_hours) +
          Number(t.actual_project_hours);
        acc.total += 1;
        if (t.statuses?.category === "done") acc.done += 1;
        return acc;
      },
      { curr: 0, orig: 0, act: 0, total: 0, done: 0 }
    );

    const context = {
      project: { name: project.name, client: project.client_name },
      cutoff,
      tickets_total: totals.total,
      tickets_done: totals.done,
      original_estimate_h: totals.orig,
      current_estimate_h: totals.curr,
      actual_h: totals.act,
      scope_changes: (changes ?? []).slice(0, 20).map((c: any) => ({
        ticket: c.ticket?.formatted_id,
        discipline: c.discipline,
        delta_h: Number(c.delta),
        reason: c.reason,
      })),
      log_notes: (notes ?? []).slice(0, 30).map((n: any) => ({
        ticket: n.ticket?.formatted_id,
        discipline: n.discipline,
        hours: Number(n.hours),
        note: n.note,
      })),
    };

    const systemPrompt = `You are a senior project manager writing a brief, client-facing status update.
Write 2 to 3 sentences, plain text (no markdown headers, no bullet lists).
Tone: confident, transparent, professional. Avoid internal jargon.
If the current estimate exceeds the original, briefly justify the increase using the scope changes provided (one concrete example is enough).
Mention progress (% done) and budget posture (on track / over / under) at a high level. Do not invent numbers.`;

    const userPrompt = `Project status as of ${cutoff}.

Data:
${JSON.stringify(context, null, 2)}

Write the client-facing summary now.`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit hit. Try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const draft: string =
      aiData?.choices?.[0]?.message?.content?.trim() ?? "";

    await admin
      .from("projects")
      .update({
        client_summary_draft: draft,
        client_summary_updated_at: new Date().toISOString(),
      })
      .eq("id", project_id);

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-summary error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
