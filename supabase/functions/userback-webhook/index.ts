import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, postIntakeComment, rehostScreenshot } from "../_shared/intake.ts";

const USERBACK_MEMBER_ID = "00000000-0000-0000-0000-0000000000b1";

const BodySchema = z.object({
  project_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
  category: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  screenshot_url: z.string().url().optional().nullable(),
  reporter_name: z.string().optional().nullable(),
  reporter_email: z.string().optional().nullable(),
  widget_data: z.unknown().optional().nullable(),
});

function mapType(category?: string | null): "CR" | "Bug" {
  return (category ?? "").toLowerCase().trim() === "feature_request" ? "CR" : "Bug";
}

function renderEnvironment(widgetData: unknown): string {
  if (!widgetData || typeof widgetData !== "object") return "";
  const entries = Object.entries(widgetData as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  if (!entries.length) return "";
  return `\n\n**Environment**\n\`\`\`\n${entries.join("\n")}\n\`\`\``;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // --- Auth: shared secret from edge function secrets ---
  const provided = req.headers.get("x-userback-secret") ?? "";
  const expected = Deno.env.get("USERBACK_WEBHOOK_SECRET") ?? "";
  if (!expected || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }


  // --- Body ---
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const payload = parsed.data;

  // --- Resolve project ---
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("userback_project_id", payload.project_id)
    .maybeSingle();
  if (projErr) return json({ error: projErr.message }, 500);
  if (!project) {
    return json(
      { error: `No project configured for Userback project ID "${payload.project_id}"` },
      400,
    );
  }

  // --- Create ticket ---
  const title = `UB - ${(payload.title ?? "").trim() || "Untitled feedback"}`;
  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .insert({
      project_id: project.id,
      title: title.slice(0, 300),
      ticket_type: mapType(payload.category),
    })
    .select("id, formatted_id")
    .single();
  if (ticketErr) return json({ error: ticketErr.message }, 500);

  const attachments = await rehostScreenshot(supabase, ticket.id, payload.screenshot_url, "userback");

  // --- Discussion comment ---
  const who = [payload.reporter_name?.trim(), payload.reporter_email?.trim()].filter(Boolean);
  const byLine = who.length
    ? `📥 Submitted via Userback by ${payload.reporter_name?.trim() || "Anonymous"}${
      payload.reporter_email?.trim() ? ` (${payload.reporter_email.trim()})` : ""
    }`
    : "📥 Submitted via Userback";
  const body = [
    byLine,
    payload.comment?.trim() ? `\n\n${payload.comment.trim()}` : "",
    renderEnvironment(payload.widget_data),
  ].join("");

  await postIntakeComment(supabase, ticket.id, USERBACK_MEMBER_ID, body, attachments);

  return json({ ok: true, ticket_id: ticket.id, formatted_id: ticket.formatted_id });
});
