// Issues a short-lived signed URL for a vaulted artifact (PMBA-only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  project_id: string;
  user_id: string;
  kind: "json" | "xlsx";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.project_id || !body?.user_id || !body?.kind) {
      return json({ error: "project_id, user_id, kind required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isPmba } = await admin.rpc("is_pmba", { _user_id: body.user_id });
    if (!isPmba) return json({ error: "PMBA role required" }, 403);

    const { data: proj } = await admin
      .from("projects")
      .select("vault_storage_path, is_archived")
      .eq("id", body.project_id)
      .maybeSingle();
    if (!proj?.is_archived || !proj.vault_storage_path) {
      return json({ error: "Project is not archived" }, 400);
    }

    const filename = body.kind === "json" ? "restore_point.json" : "project_summary.xlsx";
    const path = `${proj.vault_storage_path}/${filename}`;

    const { data, error } = await admin.storage
      .from("project-vault")
      .createSignedUrl(path, 60, { download: filename });
    if (error || !data) return json({ error: error?.message ?? "Failed" }, 500);

    return json({ url: data.signedUrl });
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
