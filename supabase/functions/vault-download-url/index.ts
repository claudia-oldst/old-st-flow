// Issues a short-lived signed URL for a vaulted artifact (PMBA-only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveVaultDownload } from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  project_id: string;
  kind: "json" | "xlsx";
}


async function verifyPmba(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Missing bearer token", status: 401 };
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return { error: "Invalid token", status: 401 };
  const sub = userData.user.id as string | undefined;
  if (!sub) return { error: "Token missing sub", status: 401 };
  const { data: member } = await admin
    .from("team_members")
    .select("id")
    .eq("auth_user_id", sub)
    .maybeSingle();
  if (!member?.id) return { error: "Not a team member", status: 403 };
  const { data: isPmba } = await admin.rpc("is_pmba", { _user_id: member.id });
  if (!isPmba) return { error: "PMBA role required", status: 403 };
  return { userId: member.id as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = await verifyPmba(req, admin);
    if ("error" in auth) return json({ error: auth.error }, auth.status);

    const body = (await req.json()) as Body;
    if (!body?.project_id || !body?.kind) {
      return json({ error: "project_id and kind required" }, 400);
    }

    const { data: proj } = await admin
      .from("projects")
      .select("vault_storage_path, is_archived")
      .eq("id", body.project_id)
      .maybeSingle();
    if (!proj?.is_archived || !proj.vault_storage_path) {
      return json({ error: "Project is not archived" }, 400);
    }

    const { path, downloadName } = resolveVaultDownload(proj.vault_storage_path, body.kind);

    const { data, error } = await admin.storage
      .from("project-vault")
      .createSignedUrl(path, 60, { download: downloadName });
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
