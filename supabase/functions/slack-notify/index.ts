// Slack DM nudges for ticket assignments pending and rejected estimate revisions.
// Invoked by database triggers via pg_net (see public.enqueue_slack_notify).
import { closingDayEmail, formatClosingDate } from "./closingToday.ts";
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
  comment_id?: string;
  project_id?: string;
  sprint_id?: string;
  count?: number;
  thread_reply?: boolean;
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
    // No link previews — keep DMs compact.
    unfurl_links: false,
    unfurl_media: false,
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


async function handleSprintBulkAssigned(admin: Admin, p: Payload, base: string | null) {
  if (!p.sprint_id || !p.user_id) return j({ error: "missing sprint_id/user_id" }, 400);
  const { data: sprint } = await admin
    .from("sprints")
    .select("id, sprint_number, name, project_id, projects(name)")
    .eq("id", p.sprint_id)
    .maybeSingle();
  if (!sprint) return j({ error: "sprint not found" }, 404);
  const { data: member } = await admin
    .from("team_members")
    .select("id, name, email, slack_user_id")
    .eq("id", p.user_id)
    .maybeSingle();
  if (!member) return j({ error: "member not found" }, 404);
  const s = sprint as Record<string, any>;
  const n = Number(p.count ?? 0);
  const projectName = s.projects?.name ?? "a project";
  const b = base ? base.replace(/\/+$/, "") : null;
  const sprintUrl = b ? `${b}/projects/${s.project_id}/sprints` : null;
  const label = `Sprint ${s.sprint_number}`;
  const slot = SLOT_LABEL[p.slot ?? ""] ?? "";
  const mrkdwn =
    `:calendar: You've been assigned *${n} ticket${n === 1 ? "" : "s"}* to work on in ` +
    `${link(sprintUrl, label)} on *${esc(projectName)}*${slot ? ` · Role: ${esc(slot)}` : ""}`;
  const fallback = `You've been assigned ${n} tickets in ${label} (${projectName})`;
  const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text: mrkdwn } }];
  if (sprintUrl) blocks.push({ type: "actions", elements: [linkButton("Open sprint", sprintUrl)] });
  const result = await dm(admin, s.project_id as string, member as any, fallback, blocks);
  return j({ ok: true, event: "sprint_bulk_assigned", result });
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

  const u = urls(base, t.project_id as string, t.id as string);
  const who = (requester as any)?.name ?? "A team member";

  const mrkdwn =
    `:hourglass_flowing_sand: *Estimate revision needs your approval*\n` +
    `${link(u.ticket, `${t.formatted_id} — ${t.title}`)} · ` +
    `${link(u.project, t.projects?.name ?? "project")}\n` +
    `${esc(who)} requested ${esc(String(c.discipline))}: ` +
    `${Number(c.previous_hours)}h → ${Number(c.new_hours)}h` +
    (c.reason ? `\nReason: ${esc(String(c.reason).slice(0, 500))}` : "");

  const text =
    `Estimate revision needs your approval — ${t.formatted_id} ${t.title}: ` +
    `${Number(c.previous_hours)}h → ${Number(c.new_hours)}h`;

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: mrkdwn } },
  ];
  const buttons = [
    ...(u.changeRequests ? [linkButton("Review request", u.changeRequests)] : []),
    ...(u.ticket ? [linkButton("Open ticket", u.ticket)] : []),
  ];
  if (buttons.length) blocks.push({ type: "actions", elements: buttons });

  const results: string[] = [];
  for (const pmba of pmbas) {
    try {
      results.push(await dm(admin, t.project_id as string, pmba, text, blocks));
    } catch (e) {
      console.error("PMBA DM failed:", (e as Error).message);
      results.push("error");
    }
  }
  return j({ ok: true, event: "estimate_revision_requested", notified: results });
}

async function handleEstimateRejected(admin: Admin, p: Payload, base: string | null) {
  if (!p.change_id) return j({ error: "missing change_id" }, 400);
  const { data: change } = await admin
    .from("ticket_estimate_changes")
    .select("id, ticket_id, user_id, discipline, previous_hours, new_hours, reason, status, decided_by")
    .eq("id", p.change_id)
    .maybeSingle();
  const c = change as Record<string, any> | null;
  if (!c) return j({ error: "change not found" }, 404);
  if (c.status !== "rejected") return j({ ok: true, skipped: "not rejected" });
  if (c.decided_by && c.decided_by === c.user_id) return j({ ok: true, skipped: "self" });

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, formatted_id, title, project_id, projects(name)")
    .eq("id", c.ticket_id)
    .maybeSingle();
  if (!ticket) return j({ error: "ticket not found" }, 404);
  const t = ticket as Record<string, any>;
  const { data: requester } = await admin
    .from("team_members").select("id, name, email, slack_user_id").eq("id", c.user_id).maybeSingle();
  if (!requester) return j({ ok: true, skipped: "no requester" });
  const { data: decider } = c.decided_by
    ? await admin.from("team_members").select("name").eq("id", c.decided_by).maybeSingle()
    : { data: null };
  const by = (decider as any)?.name ?? "a PM/BA";
  const raw = String(c.reason ?? "");
  const idx = raw.lastIndexOf("Rejected by ");
  const stamp = idx >= 0 ? raw.slice(idx) : "";
  const colon = stamp.indexOf(":");
  const why = colon >= 0 ? stamp.slice(colon + 1).trim() : "";

  const u = urls(base, t.project_id as string, t.id as string);
  const mrkdwn =
    `:x: *Your estimate revision was rejected*\n` +
    `${link(u.ticket, `${t.formatted_id} — ${t.title}`)} · ` +
    `${link(u.project, t.projects?.name ?? "project")}\n` +
    `${esc(String(c.discipline))}: ${Number(c.previous_hours)}h → ${Number(c.new_hours)}h\n` +
    `Rejected by ${esc(by)}` + (why ? `: ${esc(why.slice(0, 500))}` : "");
  const text = `Your estimate revision on ${t.formatted_id} was rejected by ${by}` + (why ? `: ${why}` : "");
  const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text: mrkdwn } }];
  if (u.ticket) blocks.push({ type: "actions", elements: [linkButton("Open ticket", u.ticket)] });
  const result = await dm(admin, t.project_id as string, requester as any, text, blocks);
  return j({ ok: true, event: "estimate_revision_rejected", result });
}

/** Strip mention/markdown syntax down to a readable excerpt. */
function excerpt(body: string, max = 300) {
  const plain = body
    .replace(/@\[([^\]]+)\]\(mention:[0-9a-fA-F-]{36}\)/g, "@$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

async function handleCommentMention(admin: Admin, p: Payload, base: string | null) {
  if (!p.comment_id || !p.user_id) return j({ error: "missing comment_id/user_id" }, 400);

  const { data: comment, error: cErr } = await admin
    .from("ticket_comments")
    .select("id, ticket_id, user_id, body")
    .eq("id", p.comment_id)
    .maybeSingle();
  if (cErr) return j({ error: cErr.message }, 500);
  if (!comment) return j({ error: "comment not found" }, 404);
  const c = comment as Record<string, any>;
  if (c.user_id === p.user_id) return j({ ok: true, skipped: "self-mention" });

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, formatted_id, title, project_id, projects(name)")
    .eq("id", c.ticket_id)
    .maybeSingle();
  if (!ticket) return j({ error: "ticket not found" }, 404);
  const t = ticket as Record<string, any>;

  const { data: member } = await admin
    .from("team_members")
    .select("id, name, email, slack_user_id")
    .eq("id", p.user_id)
    .maybeSingle();
  if (!member) return j({ error: "member not found" }, 404);

  const { data: author } = await admin
    .from("team_members")
    .select("name")
    .eq("id", c.user_id)
    .maybeSingle();

  const who = (author as any)?.name ?? "Someone";
  const u = urls(base, t.project_id as string, t.id as string);
  const snippet = excerpt(String(c.body ?? ""));

  const mrkdwn =
    (p.thread_reply ? `:speech_balloon: *${esc(who)} replied to a discussion thread you're in*\n` : `:speech_balloon: *${esc(who)} mentioned you in a discussion*\n`) +
    `${link(u.ticket, `${t.formatted_id} — ${t.title}`)} · ` +
    `${link(u.project, t.projects?.name ?? "project")}` +
    (snippet ? `\n>${esc(snippet).replace(/\n/g, "\n>")}` : "");

  const text = `${who} ${p.thread_reply ? "replied in a thread" : "mentioned you"} on ${t.formatted_id} — ${t.title}`;

  const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text: mrkdwn } }];
  if (u.ticket) {
    blocks.push({ type: "actions", elements: [linkButton("Open discussion", u.ticket)] });
  }

  const result = await dm(admin, t.project_id as string, member as any, text, blocks);
  return j({ ok: true, event: "comment_mention", result });
}

/** One-week heads-up that a project's bug-fixing closing window is approaching. */
async function handleClosingWindow(admin: Admin, p: Payload, base: string | null) {
  if (!p.project_id) return j({ error: "missing project_id" }, 400);

  const { data: project, error: pErr } = await admin
    .from("projects")
    .select("id, name, closing_window_date, lifecycle_status")
    .eq("id", p.project_id)
    .maybeSingle();
  if (pErr) return j({ error: pErr.message }, 500);
  if (!project) return j({ error: "project not found" }, 404);
  const pr = project as Record<string, any>;

  const { data: members } = await admin
    .from("project_members")
    .select("user_id, team_members(id, name, email, slack_user_id, role)")
    .eq("project_id", pr.id);

  // Operations and Director get the reminder for every project, assigned or not.
  const { data: execs } = await admin
    .from("team_members")
    .select("id, name, email, slack_user_id, role")
    .in("role", ["Operations", "Director"])
    .eq("is_active", true);

  const seen = new Set<string>();
  const pmbas: Record<string, any>[] = [];
  for (const tm of [
    ...((members ?? []) as Record<string, any>[]).map((m) => m.team_members),
    ...((execs ?? []) as Record<string, any>[]),
  ]) {
    if (!tm || !["PMBA", "Operations", "Director"].includes(tm.role) || seen.has(tm.id)) continue;
    seen.add(tm.id);
    pmbas.push(tm);
  }

  const when = pr.closing_window_date
    ? new Date(`${pr.closing_window_date}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    : "soon";
  const projectUrl = base ? `${base.replace(/\/+$/, "")}/projects/${pr.id}` : null;

  const mrkdwn =
    `:warning: *Closing window approaching* — ${link(projectUrl, pr.name ?? "project")} ` +
    `closes on ${esc(when)} (7 days).\n` +
    `Wrap up any outstanding bug fixes before the window closes.`;
  const text = `Closing window approaching — ${pr.name} closes on ${when} (7 days)`;

  const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text: mrkdwn } }];
  if (projectUrl) {
    blocks.push({ type: "actions", elements: [linkButton("Open project", projectUrl)] });
  }

  const results: string[] = [];
  for (const pmba of pmbas) {
    try {
      results.push(await dm(admin, pr.id as string, pmba, text, blocks));
    } catch (e) {
      console.error("PMBA DM failed:", (e as Error).message);
      results.push("error");
    }
  }
  return j({ ok: true, event: "closing_window_reminder", notified: results });
}

/** Day-of closing: give every active Operations user a client-ready email to send. */
async function handleClosingWindowToday(admin: Admin, p: Payload, base: string | null) {
  if (!p.project_id) return j({ error: "missing project_id" }, 400);
  const { data: project } = await admin
    .from("projects").select("id, name, closing_window_date").eq("id", p.project_id).maybeSingle();
  const pr = project as Record<string, any> | null;
  if (!pr?.closing_window_date) return j({ error: "project not found" }, 404);
  const { data: ops } = await admin
    .from("team_members").select("id, name, email, slack_user_id, role")
    .eq("role", "Operations").eq("is_active", true);
  const date = formatClosingDate(pr.closing_window_date);
  const projectUrl = base ? `${base.replace(/\/+$/, "")}/projects/${pr.id}` : null;
  const results: string[] = [];
  for (const op of (ops ?? []) as Record<string, any>[]) {
    const { subject, body } = closingDayEmail(pr.name ?? "the project", date, op.name ?? "");
    const intro = `:calendar: Support window for ${link(projectUrl, pr.name ?? "project")} ends today — here's the client message to send:`;
    const quoted = `*Subject:* ${esc(subject)}\n\n${esc(body)}`.replace(/^/gm, ">");
    const blocks: unknown[] = [
      { type: "section", text: { type: "mrkdwn", text: intro } },
      { type: "section", text: { type: "mrkdwn", text: quoted } },
    ];
    if (projectUrl) blocks.push({ type: "actions", elements: [linkButton("Open project", projectUrl)] });
    try {
      results.push(await dm(admin, pr.id as string, op, `Support window for ${pr.name} ends today`, blocks));
    } catch (e) {
      console.error("Ops DM failed:", (e as Error).message);
      results.push("error");
    }
  }
  return j({ ok: true, event: "closing_window_today", notified: results });
}

/** Post new Thalamus feedback to the project's Slack channel. */
async function handleFeedbackCreated(admin: Admin, p: Payload, base: string | null) {
  if (!p.ticket_id) return j({ error: "missing ticket_id" }, 400);

  const { data: ticket, error: tErr } = await admin
    .from("tickets")
    .select("id, formatted_id, title, project_id, projects(name, slack_channel_id)")
    .eq("id", p.ticket_id)
    .maybeSingle();
  if (tErr) return j({ error: tErr.message }, 500);
  if (!ticket) return j({ error: "ticket not found" }, 404);
  const t = ticket as Record<string, any>;

  const channel = t.projects?.slack_channel_id;
  if (!channel) return j({ ok: true, skipped: "no channel configured" });

  const feedbackUrl = base
    ? `${base.replace(/\/+$/, "")}/projects/${t.project_id}/feedback?ticket=${t.id}`
    : null;

  const mrkdwn =
    `:inbox_tray: *New feedback from Thalamus*\n` +
    `${link(feedbackUrl, `${t.formatted_id} — ${t.title}`)} · ` +
    `${link(base ? `${base.replace(/\/+$/, "")}/projects/${t.project_id}` : null, t.projects?.name ?? "project")}\n` +
    `Discuss and triage it on the feedback ticket.`;
  const text = `New feedback from Thalamus — ${t.formatted_id} ${t.title}`;

  const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text: mrkdwn } }];
  if (feedbackUrl) {
    blocks.push({ type: "actions", elements: [linkButton("Open discussion", feedbackUrl)] });
  }

  await slack("chat.postMessage", {
    channel,
    text,
    unfurl_links: false,
    unfurl_media: false,
    blocks,
  });
  return j({ ok: true, event: "feedback_created", result: "sent" });
}

Deno.serve(async (req) => {


  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["slack_notify_secret", "app_base_url"]);
    const byKey = new Map(
      ((settings ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]),
    );
    const expected = byKey.get("slack_notify_secret");
    if (!expected || req.headers.get("x-notify-secret") !== expected) {
      return j({ error: "unauthorized" }, 401);
    }
    const base = byKey.get("app_base_url") ?? null;

    const payload = (await req.json()) as Payload;
    if (payload.event === "ticket_assigned") return await handleAssignment(admin, payload, base);
    if (payload.event === "sprint_bulk_assigned") {
      return await handleSprintBulkAssigned(admin, payload, base);
    }
    if (payload.event === "estimate_revision_requested") {
      return await handleEstimateRevision(admin, payload, base);
    }
    if (payload.event === "estimate_revision_rejected") {
      return await handleEstimateRejected(admin, payload, base);
    }
    if (payload.event === "comment_mention") {
      return await handleCommentMention(admin, payload, base);
    }
    if (payload.event === "closing_window_reminder") {
      return await handleClosingWindow(admin, payload, base);
    }
    if (payload.event === "closing_window_today") {
      return await handleClosingWindowToday(admin, payload, base);
    }
    if (payload.event === "feedback_created") {
      return await handleFeedbackCreated(admin, payload, base);
    }

    return j({ error: `unknown event: ${payload.event}` }, 400);
  } catch (e) {
    console.error("slack-notify error:", (e as Error).message);
    return j({ error: (e as Error).message }, 500);
  }
});
