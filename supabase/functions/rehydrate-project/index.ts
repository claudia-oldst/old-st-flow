// Re-hydrate an archived project from its vault: verify checksum, optionally
// remap missing user_ids, then call rehydrate_project RPC inside one tx.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  project_id: string;
  user_id: string;
  member_map?: Record<string, string>; // original user_id → replacement user_id
  delete_vault?: boolean;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function collectUserIds(payload: any): string[] {
  const ids = new Set<string>();
  const push = (v: any) => v && typeof v === "string" && ids.add(v);
  for (const r of payload.project_members ?? []) push(r.user_id);
  for (const r of payload.ticket_assignees ?? []) push(r.user_id);
  for (const r of payload.ticket_comments ?? []) push(r.user_id);
  for (const r of payload.ticket_estimate_changes ?? []) {
    push(r.user_id);
    push(r.decided_by);
  }
  for (const r of payload.time_logs ?? []) push(r.user_id);
  for (const r of payload.tickets ?? []) push(r.cr_decided_by);
  return [...ids];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.project_id || !body?.user_id) {
      return json({ error: "project_id and user_id required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // PMBA gate
    const { data: isPmba } = await admin.rpc("is_pmba", { _user_id: body.user_id });
    if (!isPmba) return json({ error: "PMBA role required" }, 403);

    // Load project skeleton
    const { data: proj, error: projErr } = await admin
      .from("projects")
      .select("id, is_archived, vault_storage_path, vault_checksum")
      .eq("id", body.project_id)
      .maybeSingle();
    if (projErr || !proj) return json({ error: "Project not found" }, 404);
    if (!proj.is_archived || !proj.vault_storage_path) {
      return json({ error: "Project is not archived" }, 400);
    }

    // Download JSON
    const dl = await admin.storage
      .from("project-vault")
      .download(`${proj.vault_storage_path}/restore_point.json`);
    if (dl.error || !dl.data) return json({ error: "Vault JSON missing" }, 500);
    const text = await dl.data.text();
    const checksum = await sha256Hex(text);
    if (proj.vault_checksum && checksum !== proj.vault_checksum) {
      return json({ error: "Vault file corrupted (checksum mismatch)" }, 500);
    }
    const payload = JSON.parse(text);

    // Member-mapping check
    const userIds = collectUserIds(payload);
    if (userIds.length) {
      const { data: existing } = await admin
        .from("team_members")
        .select("id")
        .in("id", userIds);
      const existingSet = new Set((existing ?? []).map((r) => r.id));
      const map = body.member_map ?? {};
      const missing = userIds.filter((id) => !existingSet.has(id) && !map[id]);
      if (missing.length) {
        return json({ missing_users: missing }, 200);
      }
    }

    // Rehydrate (single tx)
    const { error: rehErr } = await admin.rpc("rehydrate_project", {
      _project_id: body.project_id,
      _payload: payload,
      _member_map: body.member_map ?? {},
    });
    if (rehErr) return json({ error: `Rehydrate: ${rehErr.message}` }, 500);

    if (body.delete_vault) {
      await admin.storage.from("project-vault").remove([
        `${proj.vault_storage_path}/restore_point.json`,
        `${proj.vault_storage_path}/project_summary.xlsx`,
      ]);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
