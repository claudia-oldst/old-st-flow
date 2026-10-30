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

export const MAX_RECORDING_BYTES = 5 * 1024 * 1024;

/** Copies the short-lived Thalamus recording into Pulse's private attachment bucket. */
// deno-lint-ignore no-explicit-any
export async function rehostRecording(supabase: any, ticketId: string, url: string | null | undefined, fetcher: typeof fetch = fetch) {
  const out: Array<Record<string, unknown>> = [];
  if (!url) return out;
  try {
    const res = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (mime !== "video/webm") throw new Error("expected video/webm");
    if (Number(res.headers.get("content-length")) > MAX_RECORDING_BYTES) throw new Error("exceeds 5 MB");
    if (!res.body) throw new Error("empty recording");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RECORDING_BYTES) {
          await reader.cancel();
          throw new Error("exceeds 5 MB");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (bytes[0] !== 0x1a || bytes[1] !== 0x45 || bytes[2] !== 0xdf || bytes[3] !== 0xa3) {
      throw new Error("invalid WebM signature");
    }
    const path = `${ticketId}/${crypto.randomUUID()}.webm`;
    const { error } = await supabase.storage.from("ticket-attachments")
      .upload(path, bytes, { contentType: "video/webm", upsert: false });
    if (error) throw new Error("storage upload failed");
    out.push({ url: "", path, name: "thalamus-recording.webm", mime: "video/webm", size, kind: "video" });
  } catch (e) {
    // Never log signed URLs (including fetch errors which can contain the token).
    console.error("Thalamus recording could not be attached");
  }
  return out;
}

/** Posts the intake's first discussion comment as the bot member. */
// deno-lint-ignore no-explicit-any
export async function postIntakeComment(supabase: any, ticketId: string, botId: string, body: string, attachments: unknown[]) {
  const { error } = await supabase.from("ticket_comments").insert({ ticket_id: ticketId, user_id: botId, body, attachments });
  if (error) console.error("comment insert failed", error.message);
}
