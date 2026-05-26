// Archive a project to cold storage: dump JSON + XLSX to project-vault bucket,
// verify integrity via SHA-256, then purge child rows. PMBA-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  project_id: string;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildXlsx(payload: any): Uint8Array {
  const wb = XLSX.utils.book_new();
  const proj = payload.project ?? {};
  const tickets: any[] = payload.tickets ?? [];
  const logs: any[] = payload.time_logs ?? [];
  const changes: any[] = payload.ticket_estimate_changes ?? [];
  const comments: any[] = payload.ticket_comments ?? [];

  const totalHours = logs.reduce((s, l) => s + Number(l.hours ?? 0), 0);
  const totalCost = totalHours * Number(proj.rate_per_hour ?? 0);

  const summary = [
    ["Project", proj.name],
    ["Acronym", proj.acronym],
    ["Client", proj.client_name ?? ""],
    ["Rate per hour", proj.rate_per_hour ?? 0],
    ["Archived at", new Date().toISOString()],
    ["Tickets", tickets.length],
    ["Time logs", logs.length],
    ["Estimate changes", changes.length],
    ["Comments", comments.length],
    ["Total hours", totalHours],
    ["Total cost", totalCost],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  const ticketRows = tickets.map((t) => ({
    formatted_id: t.formatted_id,
    title: t.title,
    type: t.ticket_type,
    fe_status: t.fe_status,
    be_status: t.be_status,
    fe_estimate: t.current_fe_estimate,
    be_estimate: t.current_be_estimate,
    proj_estimate: t.current_project_estimate,
    fe_actual: t.actual_frontend_hours,
    be_actual: t.actual_backend_hours,
    proj_actual: t.actual_project_hours,
    created_at: t.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketRows), "Tickets");

  const ticketById = new Map(tickets.map((t) => [t.id, t.formatted_id]));
  const logRows = logs.map((l) => ({
    ticket: ticketById.get(l.ticket_id) ?? l.ticket_id,
    discipline: l.discipline,
    hours: l.hours,
    user_id: l.user_id,
    logged_at: l.logged_at,
    note: l.note,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logRows), "Time Logs");

  const crRows = tickets
    .filter((t) => t.ticket_type === "CR")
    .map((t) => ({
      formatted_id: t.formatted_id,
      title: t.title,
      cr_approval: t.cr_approval,
      decided_at: t.cr_decided_at,
      fe_estimate: t.current_fe_estimate,
      be_estimate: t.current_be_estimate,
      proj_estimate: t.current_project_estimate,
    }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(crRows.length ? crRows : [{ note: "No change requests" }]),
    "Change Requests",
  );

  const commentRows = comments.map((c) => ({
    ticket: ticketById.get(c.ticket_id) ?? c.ticket_id,
    user_id: c.user_id,
    body: c.body,
    created_at: c.created_at,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(commentRows.length ? commentRows : [{ note: "No comments" }]),
    "Comments",
  );

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out);
}

// Verify the caller's JWT and resolve their team_members.id. Returns null on failure.
async function verifyPmba(
  req: Request,
  admin: ReturnType<typeof createClient>,
): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing bearer token", status: 401 };
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return { error: "Invalid token", status: 401 };
  const sub = userData.user.id;
  if (!sub) return { error: "Token missing sub", status: 401 };
  const { data: member } = await admin
    .from("team_members")
    .select("id")
    .eq("auth_user_id", sub)
    .maybeSingle();
  if (!member?.id) return { error: "Not a team member", status: 403 };
  const { data: isPmba } = await admin.rpc("is_pmba", { _user_id: member.id });
  if (!isPmba) return { error: "PMBA role required", status: 403 };
  return { userId: member.id };
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
    if (!body?.project_id) return json({ error: "project_id required" }, 400);

    const { data: payload, error: payloadErr } = await admin.rpc(
      "get_project_archive_payload",
      { _project_id: body.project_id },
    );
    if (payloadErr || !payload) {
      return json({ error: payloadErr?.message ?? "No payload" }, 500);
    }
    if ((payload as any).project?.is_archived) {
      return json({ error: "Project already archived" }, 400);
    }

    const proj = (payload as any).project;
    const tickets: any[] = (payload as any).tickets ?? [];
    const logs: any[] = (payload as any).time_logs ?? [];
    const totalHours = logs.reduce((s, l) => s + Number(l.hours ?? 0), 0);
    const totalCost = totalHours * Number(proj.rate_per_hour ?? 0);

    const rowCounts = {
      tickets: tickets.length,
      project_members: ((payload as any).project_members ?? []).length,
      project_epics: ((payload as any).project_epics ?? []).length,
      project_epic_summaries: ((payload as any).project_epic_summaries ?? []).length,
      ticket_assignees: ((payload as any).ticket_assignees ?? []).length,
      ticket_comments: ((payload as any).ticket_comments ?? []).length,
      ticket_estimate_changes: ((payload as any).ticket_estimate_changes ?? []).length,
      time_logs: logs.length,
    };

    const jsonText = JSON.stringify(payload);
    const checksum = await sha256Hex(jsonText);
    const xlsxBytes = buildXlsx(payload);

    const folder = `${body.project_id}`;
    const jsonPath = `${folder}/restore_point.json`;
    const xlsxPath = `${folder}/project_summary.xlsx`;

    const upJson = await admin.storage
      .from("project-vault")
      .upload(jsonPath, new Blob([jsonText], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
      });
    if (upJson.error) return json({ error: `JSON upload: ${upJson.error.message}` }, 500);

    const upXlsx = await admin.storage
      .from("project-vault")
      .upload(xlsxPath, new Blob([xlsxBytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }), {
        upsert: true,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    if (upXlsx.error) return json({ error: `XLSX upload: ${upXlsx.error.message}` }, 500);

    const dl = await admin.storage.from("project-vault").download(jsonPath);
    if (dl.error || !dl.data) return json({ error: "Could not verify JSON upload" }, 500);
    const downloaded = await dl.data.text();
    const verified = await sha256Hex(downloaded);
    if (verified !== checksum) {
      return json({ error: "Checksum mismatch after upload — aborting purge" }, 500);
    }

    const { error: updErr } = await admin
      .from("projects")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        vault_storage_path: folder,
        cached_total_hours: totalHours,
        cached_total_cost: totalCost,
        vault_checksum: checksum,
        vault_row_counts: rowCounts,
      })
      .eq("id", body.project_id);
    if (updErr) return json({ error: `Project update: ${updErr.message}` }, 500);

    const { error: purgeErr } = await admin.rpc("purge_project_children", {
      _project_id: body.project_id,
    });
    if (purgeErr) return json({ error: `Purge: ${purgeErr.message}` }, 500);

    return json({
      ok: true,
      vault_storage_path: folder,
      checksum,
      counts: rowCounts,
      cached_total_hours: totalHours,
      cached_total_cost: totalCost,
    });
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
