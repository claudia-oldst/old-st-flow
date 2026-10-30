// Shared helpers for external feedback intakes (Thalamus).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Downloads a remote screenshot and stores it as a comment attachment. */
// deno-lint-ignore no-explicit-any
export async function rehostScreenshot(supabase: any, ticketId: string, url: string | null | undefined, prefix: string) {
  const out: Array<Record<string, unknown>> = [];
  if (!url) return out;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error("screenshot fetch failed", res.status); return out; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
    const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
    const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, bytes, { contentType: mime, upsert: false });
    if (error) { console.error("screenshot upload failed", error.message); return out; }
    out.push({ url: "", path, name: `${prefix}-screenshot.${ext}`, mime, size: bytes.byteLength, kind: mime.startsWith("image/") ? "image" : "file" });
  } catch (e) {
    console.error("screenshot error", e instanceof Error ? e.message : String(e));
  }
  return out;
}

/** Posts the intake's first discussion comment as the bot member. */
// deno-lint-ignore no-explicit-any
export async function postIntakeComment(supabase: any, ticketId: string, botId: string, body: string, attachments: unknown[]) {
  const { error } = await supabase.from("ticket_comments").insert({ ticket_id: ticketId, user_id: botId, body, attachments });
  if (error) console.error("comment insert failed", error.message);
}
