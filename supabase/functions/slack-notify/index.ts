// Slack DM nudges for ticket assignments and pending estimate revisions.
// Invoked by database triggers via pg_net (see public.enqueue_slack_notify).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-notify-secret",
};

const SLACK_API = "https://slack.com/api";

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Admin = ReturnType<typeof createClient>;

interface Payload {
  event?: string;
  ticket_id?: string;
  user_id?: string;
  slot?: string;
  change_id?: string;
}

async function slack(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) throw new Error("SLACK_BOT_TOKEN not configured");
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`slack ${method} [${res.status}]: ${text}`);
  const data = JSON.parse(text);
  if (!data.ok) throw new Error(`slack ${method} failed: ${data.error}`);
  return data;
}

async function slackGet(method: string, params: Record<string, string>) {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) throw new Error("SLACK_BOT_TOKEN not configured");
  const url = `${SLACK_API}/${method}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`slack ${method} [${res.status}]: ${text}`);
  return JSON.parse(text);
}

/** Resolve a team member to a Slack user id (explicit id wins, else email lookup). */
async function resolveSlackId(
  member: { slack_user_id?: string | null; email?: string | null },
): Promise<string | null> {
  if (member.slack_user_id) return member.slack_user_id;
  if (!member.email) return null;
  const data = await slackGet("users.lookupByEmail", { email: member.email });
  if (!data.ok) {
    console.error(`users.lookupByEmail failed for ${member.email}: ${data.error}`);
    return null;
  }
  return data.user?.id ?? null;
}

/** Notifications are opt-out: a missing row means enabled. */
async function isEnabled(admin: Admin, projectId: string, userId: string) {
  const { data } = await admin
    .from("project_notification_prefs")
    .select("slack_enabled")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { slack_enabled?: boolean } | null)?.slack_enabled !== false;
}

async function dm(
  admin: Admin,
  projectId: string,
  member: { id: string; slack_user_id?: string | null; email?: string | null },
  text: string,
  blocks?: unknown[],
) {
  if (!(await isEnabled(admin, projectId, member.id))) return "muted";
  const slackId = await resolveSlackId(member);
  if (!slackId) return "no-slack-user";
  await slack("chat.postMessage", {
    channel: slackId,
    text,
    ...(blocks ? { blocks } : {}),
  });
  return "sent";
}

const SLOT_LABEL: Record<string, string> = {
  FE: "Frontend",
  BE: "Backend",
  Project: "Project",
};

/** Slack mrkdwn requires these escaped inside link labels and text. */
function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function link(url: string | null, label: string) {
  return url ? `<${url}|${esc(label)}>` : `*${esc(label)}*`;
}

function urls(base: string | null, projectId: string, ticketId: string) {
  if (!base) return { project: null, ticket: null, changeRequests: null };
  const b = base.replace(/\/+$/, "");
  return {
    project: `${b}/projects/${projectId}`,
    ticket: `${b}/projects/${projectId}?ticket=${ticketId}`,
    changeRequests: `${b}/projects/${projectId}/change-requests`,
  };
}

function linkButton(text: string, url: string) {
  return { type: "button", text: { type: "plain_text", text, emoji: true }, url };
}

async function handleAssignment(admin: Admin, p: Payload, base: string | null) {
  if (!p.ticket_id || !p.user_id) return j({ error: "missing ticket_id/user_id" }, 400);

  const { data: ticket, error: tErr } = await admin
    .from("tickets")
    .select("id, formatted_id, title, project_id, projects(name)")
    .eq("id", p.ticket_id)
    .maybeSingle();
  if (tErr) return j({ error: tErr.message }, 500);
  if (!ticket) return j({ error: "ticket not found" }, 404);

  const { data: member, error: mErr } = await admin
    .from("team_members")
    .select("id, name, email, slack_user_id")
    .eq("id", p.user_id)
    .maybeSingle();
  if (mErr) return j({ error: mErr.message }, 500);
  if (!member) return j({ error: "member not found" }, 404);

  const t = ticket as Record<string, any>;
  const projectName = t.projects?.name ?? "a project";
  const slot = SLOT_LABEL[p.slot ?? ""] ?? p.slot ?? "";
  const u = urls(base, t.project_id as string, t.id as string);

  const mrkdwn =
    `:ticket: You've been assigned to ` +
    `${link(u.ticket, `${t.formatted_id} — ${t.title}`)}\n` +
    `Project: ${link(u.project, projectName)}${slot ? ` · Role: ${esc(slot)}` : ""}`;
  const fallback = `You've been assigned to ${t.formatted_id} — ${t.title} (${projectName})`;

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: mrkdwn } },
  ];
  if (u.ticket) {
    blocks.push({ type: "actions", elements: [linkButton("Open ticket", u.ticket)] });
  }

  const result = await dm(admin, t.project_id as string, member as any, fallback, blocks);
  return j({ ok: true, event: "ticket_assigned", result });
}


async function handleEstimateRevision(admin: Admin, p: Payload, base: string | null) {
  if (!p.change_id) return j({ error: "missing change_id" }, 400);

  const { data: change, error: cErr } = await admin
    .from("ticket_estimate_changes")
    .select("id, ticket_id, user_id, discipline, previous_hours, new_hours, reason, status")
    .eq("id", p.change_id)
    .maybeSingle();
  if (cErr) return j({ error: cErr.message }, 500);
  if (!change) return j({ error: "change not found" }, 404);
  const c = change as Record<string, any>;
  if (c.status !== "pending") return j({ ok: true, skipped: "not pending" });

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, formatted_id, title, project_id, projects(name)")
    .eq("id", c.ticket_id)
    .maybeSingle();
  if (!ticket) return j({ error: "ticket not found" }, 404);
  const t = ticket as Record<string, any>;

  const { data: requester } = await admin
    .from("team_members")
    .select("name")
    .eq("id", c.user_id)
    .maybeSingle();

  const { data: members } = await admin
    .from("project_members")
    .select("user_id, team_members(id, name, email, slack_user_id, role)")
    .eq("project_id", t.project_id);

  const pmbas = ((members ?? []) as Record<string, any>[])
    .map((m) => m.team_members)
    .filter((tm) => tm && tm.role === "PMBA");

  const text =
    `:hourglass_flowing_sand: *Estimate revision needs your approval*\n` +
    `${t.formatted_id} — ${t.title} (${t.projects?.name ?? "project"})\n` +
    `${(requester as any)?.name ?? "A team member"} requested ${c.discipline}: ` +
    `${Number(c.previous_hours)}h → ${Number(c.new_hours)}h` +
    (c.reason ? `\nReason: ${String(c.reason).slice(0, 500)}` : "");

  const results: string[] = [];
  for (const pmba of pmbas) {
    try {
      results.push(await dm(admin, t.project_id as string, pmba, text));
    } catch (e) {
      console.error("PMBA DM failed:", (e as Error).message);
      results.push("error");
    }
  }
  return j({ ok: true, event: "estimate_revision_requested", notified: results });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretRow } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "slack_notify_secret")
      .maybeSingle();
    const expected = (secretRow as { value?: string } | null)?.value;
    if (!expected || req.headers.get("x-notify-secret") !== expected) {
      return j({ error: "unauthorized" }, 401);
    }

    const payload = (await req.json()) as Payload;
    if (payload.event === "ticket_assigned") return await handleAssignment(admin, payload);
    if (payload.event === "estimate_revision_requested") {
      return await handleEstimateRevision(admin, payload);
    }
    return j({ error: `unknown event: ${payload.event}` }, 400);
  } catch (e) {
    console.error("slack-notify error:", (e as Error).message);
    return j({ error: (e as Error).message }, 500);
  }
});
