import { assert, assertEquals } from "jsr:@std/assert@1";
import { MAX_RECORDING_BYTES, rehostRecording } from "../_shared/intake.ts";
import { Body } from "./schema.ts";

const payload = { id: "recording-test", project_id: "00000000-0000-4000-8000-000000000001", acronym: "PUL" };
const signedUrl = "https://dqpgjriwudzmhcfyhbpa.supabase.co/storage/v1/object/sign/feedback-recordings/site/report.webm?token=test";
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00]);

function storageMock(fail = false) {
  const uploads: Array<{ path: string; bytes: Uint8Array; options: unknown }> = [];
  return {
    uploads,
    storage: { from(bucket: string) {
      assertEquals(bucket, "ticket-attachments");
      return { upload(path: string, bytes: Uint8Array, options: unknown) {
        uploads.push({ path, bytes, options });
        return Promise.resolve({ error: fail ? { message: "failed" } : null });
      } };
    } },
  };
}

Deno.test("intake accepts an optional recording URL and legacy screenshot payloads", () => {
  assert(Body.safeParse(payload).success);
  assert(Body.safeParse({ ...payload, screenshot: { url: "https://example.com/image.png" } }).success);
  assert(Body.safeParse({ ...payload, recording: { url: signedUrl } }).success);
  assert(Body.safeParse({ ...payload, recording: null }).success);
});

Deno.test("recording URL must be signed HTTPS Supabase storage, not an arbitrary fetch target", () => {
  for (const url of ["http://127.0.0.1/private", "https://example.com/video.webm", "https://x.supabase.co.evil.com/storage/v1/object/sign/x", "https://x.supabase.co/rest/v1/tickets"]) {
    assertEquals(Body.safeParse({ ...payload, recording: { url } }).success, false);
  }
  assertEquals(Body.safeParse({ ...payload, recording: {} }).success, false);
});

Deno.test("recording is re-hosted as a private playable video attachment", async () => {
  const db = storageMock();
  const fetcher: typeof fetch = (_input, init) => {
    assertEquals(init?.redirect, "error");
    return Promise.resolve(new Response(webm, { headers: { "content-type": "video/webm" } }));
  };
  const attachments = await rehostRecording(db, "ticket-id", signedUrl, fetcher);
  assertEquals(db.uploads.length, 1);
  assert(db.uploads[0].path.startsWith("ticket-id/"));
  assert(db.uploads[0].path.endsWith(".webm"));
  assertEquals(db.uploads[0].bytes, webm);
  assertEquals(attachments, [{ url: "", path: db.uploads[0].path, name: "thalamus-recording.webm", mime: "video/webm", size: 5, kind: "video" }]);
});

Deno.test("no recording means no fetch or upload", async () => {
  const db = storageMock();
  const fetcher: typeof fetch = () => { throw new Error("must not fetch"); };
  assertEquals(await rehostRecording(db, "ticket", undefined, fetcher), []);
  assertEquals(db.uploads.length, 0);
});

Deno.test("only WebM MIME and signature are accepted", async () => {
  for (const [mime, bytes] of [["video/mp4", webm], ["video/webm", new Uint8Array([1, 2, 3, 4])]] as const) {
    const db = storageMock();
    const fetcher: typeof fetch = () => Promise.resolve(new Response(bytes, { headers: { "content-type": mime } }));
    assertEquals(await rehostRecording(db, "ticket", signedUrl, fetcher), []);
    assertEquals(db.uploads.length, 0);
  }
});

Deno.test("recordings up to 5 MB are accepted but larger streams are rejected", async () => {
  assertEquals(MAX_RECORDING_BYTES, 5 * 1024 * 1024);
  for (const size of [5 * 1024 * 1024, 5 * 1024 * 1024 + 1]) {
    const bytes = new Uint8Array(size);
    bytes.set(webm);
    const db = storageMock();
    const fetcher: typeof fetch = () => Promise.resolve(new Response(bytes, { headers: { "content-type": "video/webm" } }));
    const result = await rehostRecording(db, "ticket", signedUrl, fetcher);
    assertEquals(result.length, size === 5 * 1024 * 1024 ? 1 : 0);
  }
});

Deno.test("expired recordings and failed uploads do not fail intake", async () => {
  const expired: typeof fetch = () => Promise.resolve(new Response("expired", { status: 403 }));
  assertEquals(await rehostRecording(storageMock(), "ticket", signedUrl, expired), []);
  const valid: typeof fetch = () => Promise.resolve(new Response(webm, { headers: { "content-type": "video/webm" } }));
  assertEquals(await rehostRecording(storageMock(true), "ticket", signedUrl, valid), []);
});