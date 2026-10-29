import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { json, postIntakeComment, rehostScreenshot } from "../_shared/intake.ts";
import { renderReport } from "./format.ts";

const THALAMUS_MEMBER_ID = "00000000-0000-0000-0000-0000000000b2";
const SOURCE = "thalamus";
const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://oldst-pulse.lovable.app";

const Body = z.object({
  id: z.string().min(1).max(100),
  project_id: z.string().uuid("project_id must be the project UUID from the Pulse URL"),
  acronym: z.string().min(1).max(20),
  type: z.string().optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  screenshot: z.object({ url: z.string().url().nullable().optional() }).partial().optional().nullable(),
}).passthrough();

const fail = (error: string, status: number) => json({ ok: false, error }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const expected = Deno.env.get("THALAMUS_FEEDBACK_SECRET") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const provided = req.headers.get("x-feedback-secret") ?? bearer;
  if (!expected || provided !== expected) return fail("Unauthorized", 401);

  let raw: unknown;
  try { raw = await req.json(); } catch { return fail("Invalid JSON body", 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return fail(JSON.stringify(parsed.error.flatten().fieldErrors), 400);
  const p = parsed.data;
  const ref = req.headers.get("idempotency-key") || p.id;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const respond = (t: { id: string; formatted_id: string; project_id: string }, status = 200) =>
    json({ ok: true, ticket_id: t.id, formatted_id: t.formatted_id, url: `${APP_URL}/projects/${t.project_id}/feedback?ticket=${t.id}` }, status);

  const { data: existing } = await supabase.from("tickets").select("id, formatted_id, project_id")
    .eq("external_source", SOURCE).eq("external_ref", ref).maybeSingle();
  if (existing) return respond(existing);

  const { data: project, error: projErr } = await supabase.from("projects").select("id")
    .eq("id", p.project_id).ilike("acronym", p.acronym).eq("is_archived", false).maybeSingle();
  if (projErr) return fail(projErr.message, 500);
  if (!project) return fail(`No active project found matching ID '${p.project_id}' and acronym '${p.acronym}'`, 404);

  const { data: ticket, error } = await supabase.from("tickets").insert({
    project_id: project.id,
    title: ((p.title ?? "").trim() || "Untitled feedback").slice(0, 300),
    ticket_type: "Feedback",
    external_source: SOURCE,
    external_ref: ref,
  }).select("id, formatted_id, project_id").single();
  if (error) return fail(error.message, 500);

  const attachments = await rehostScreenshot(supabase, ticket.id, p.screenshot?.url, "thalamus");
  await postIntakeComment(supabase, ticket.id, THALAMUS_MEMBER_ID, renderReport(p as never), attachments);
  return respond(ticket, 201);
});
