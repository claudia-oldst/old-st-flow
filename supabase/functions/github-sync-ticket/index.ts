import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  ticket_id: z.string().uuid(),
});

const GITHUB_API = "https://api.github.com";

interface Ticket {
  id: string;
  project_id: string;
  formatted_id: string;
  title: string;
  acceptance_criteria: string | null;
  status_id: string | null;
  github_issue_number: number | null;
  github_issue_node_id: string | null;
  ticket_type: "Standard" | "Bug" | "CR" | "Proj";
  epic_id: number | null;
  parent_ticket_id: string | null;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  version: string | null;
}

interface Project {
  id: string;
  github_owner: string | null;
  github_repo: string | null;
}

const storyType = (t: Ticket["ticket_type"]): "Task" | "Bug" | "Feature" => {
  if (t === "Bug") return "Bug";
  if (t === "CR") return "Feature";
  return "Task"; // Standard, Proj
};

const effortBucket = (total: number): string => {
  if (total <= 0) return "Unestimated";
  if (total <= 4) return "XS (≤ 4h)";
  if (total <= 8) return "S (≤ 8h)";
  if (total <= 16) return "M (≤ 16h)";
  if (total <= 40) return "L (≤ 40h)";
  return "XL (> 40h)";
};

const fmtHours = (n: number): string => {
  if (!n) return "0h";
  // strip trailing zeros
  return `${Number.isInteger(n) ? n : Number(n.toFixed(2))}h`;
};

function renderBody(
  ticket: Ticket,
  epicName: string | null,
  parent: { formatted_id: string; github_issue_number: number | null } | null,
): string {
  const sections: string[] = [];

  sections.push(`## Ticket Number\n${ticket.formatted_id}`);
  sections.push(`## Story Type\n${storyType(ticket.ticket_type)}`);

  const fe = Number(ticket.current_fe_estimate) || 0;
  const be = Number(ticket.current_be_estimate) || 0;
  const pj = Number(ticket.current_project_estimate) || 0;
  const total = fe + be + pj;

  sections.push(`## Effort\n${effortBucket(total)}`);

  if (total > 0) {
    const parts: string[] = [];
    if (be > 0) parts.push(`BE ${fmtHours(be)}`);
    if (fe > 0) parts.push(`FE ${fmtHours(fe)}`);
    if (pj > 0) parts.push(`Project ${fmtHours(pj)}`);
    sections.push(`## Estimated Effort (detail)\n${parts.join(" · ")}`);
  }

  sections.push(`## User Story\n${ticket.title}`);

  if (ticket.acceptance_criteria?.trim()) {
    sections.push(`## Acceptance Criteria\n${ticket.acceptance_criteria.trim()}`);
  }

  if (epicName) {
    sections.push(`## Epic\n${epicName}`);
  }

  if (ticket.ticket_type === "Bug" && parent) {
    const ref = parent.github_issue_number
      ? `#${parent.github_issue_number}`
      : parent.formatted_id;
    sections.push(`## Parent ticket\n${ref}`);
  }

  if (ticket.version?.trim()) {
    sections.push(`## Version\n${ticket.version.trim()}`);
  }

  sections.push(`---\nSynced from Lovable · ticket \`${ticket.formatted_id}\``);

  return sections.join("\n\n");
}

const DISCIPLINE_LABEL: Record<string, string> = {
  todo: "to-do",
  in_progress: "in progress",
  for_integration: "for integration",
  done: "done",
};

const LABEL_COLORS: Record<string, string> = {
  "type: bug": "d73a4a",
  "type: feature": "1f6feb",
  "type: task": "8b949e",
};
const EPIC_COLOR = "8957e5";
const STATUS_COLOR = "c5d1d8";
const FE_STATUS_COLOR = "1f6feb";
const BE_STATUS_COLOR = "0e8a8a";

async function ensureLabel(
  repoPath: string,
  name: string,
  headers: Record<string, string>,
) {
  const check = await fetch(
    `${GITHUB_API}/repos/${repoPath}/labels/${encodeURIComponent(name)}`,
    { headers },
  );
  if (check.ok) return;
  if (check.status !== 404) return;
  const color =
    LABEL_COLORS[name] ??
    (name.startsWith("epic:")
      ? EPIC_COLOR
      : name.startsWith("fe status:")
        ? FE_STATUS_COLOR
        : name.startsWith("be status:")
          ? BE_STATUS_COLOR
          : name.startsWith("status:")
            ? STATUS_COLOR
            : "ededed");
  const res = await fetch(`${GITHUB_API}/repos/${repoPath}/labels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok && res.status !== 422) {
    const txt = await res.text();
    console.warn(`label create ${name} ${res.status}: ${txt}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

    if (!GITHUB_TOKEN) {
      return json(500, { ok: false, error: "GITHUB_TOKEN not configured" });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return json(401, { error: "Unauthorized" });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json(400, { error: parsed.error.flatten().fieldErrors });
    }
    const { ticket_id } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: accessCheck, error: accessErr } = await userClient
      .from("tickets")
      .select("id")
      .eq("id", ticket_id)
      .maybeSingle();
    if (accessErr || !accessCheck) {
      return json(403, { error: "No access to this ticket" });
    }

    const { data: ticket, error: tErr } = await admin
      .from("tickets")
      .select(
        "id, project_id, formatted_id, title, acceptance_criteria, status_id, github_issue_number, github_issue_node_id, ticket_type, epic_id, parent_ticket_id, current_fe_estimate, current_be_estimate, current_project_estimate, version",
      )
      .eq("id", ticket_id)
      .single<Ticket>();
    if (tErr || !ticket) return json(404, { error: "Ticket not found" });

    const { data: project } = await admin
      .from("projects")
      .select("id, github_owner, github_repo")
      .eq("id", ticket.project_id)
      .single<Project>();

    if (!project?.github_owner || !project?.github_repo) {
      return json(200, { ok: true, skipped: "no_repo" });
    }

    // Parallel lookups
    const [assigneesRes, statusRes, epicRes, parentRes] = await Promise.all([
      admin.from("ticket_assignees").select("user_id, slot").eq("ticket_id", ticket_id),
      ticket.status_id
        ? admin.from("statuses").select("name, category").eq("id", ticket.status_id).maybeSingle()
        : Promise.resolve({ data: null }),
      ticket.epic_id
        ? admin.from("project_epics").select("epic_name").eq("id", ticket.epic_id).maybeSingle()
        : Promise.resolve({ data: null }),
      ticket.parent_ticket_id
        ? admin
            .from("tickets")
            .select("formatted_id, github_issue_number")
            .eq("id", ticket.parent_ticket_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const userIds = (assigneesRes.data ?? []).map((a) => a.user_id);
    let githubUsernames: string[] = [];
    if (userIds.length) {
      const { data: members } = await admin
        .from("team_members")
        .select("id, github_username")
        .in("id", userIds);
      githubUsernames = (members ?? [])
        .map((m) => m.github_username)
        .filter((u): u is string => !!u);
    }

    const statusData = statusRes.data as { name: string; category: string } | null;
    const state: "open" | "closed" = statusData?.category === "done" ? "closed" : "open";
    const epicName = (epicRes.data as { epic_name: string | null } | null)?.epic_name ?? null;
    const parent = parentRes.data as
      | { formatted_id: string; github_issue_number: number | null }
      | null;

    const title = `[${ticket.formatted_id}] ${ticket.title}`;
    const body = renderBody(ticket, epicName, parent);

    // Build labels
    const typeLabel = `type: ${storyType(ticket.ticket_type).toLowerCase()}`;
    const labels: string[] = [typeLabel];
    if (epicName) labels.push(`epic: ${epicName.toLowerCase()}`);
    if (statusData?.name) labels.push(`status: ${statusData.name.toLowerCase()}`);

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    const repoPath = `${project.github_owner}/${project.github_repo}`;

    // Ensure labels exist on the repo before applying
    await Promise.all(labels.map((l) => ensureLabel(repoPath, l, ghHeaders)));

    if (ticket.github_issue_number == null) {
      const res = await fetch(`${GITHUB_API}/repos/${repoPath}/issues`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ title, body, assignees: githubUsernames, labels }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("GitHub create failed", res.status, data);
        return json(502, { ok: false, error: `GitHub ${res.status}: ${data?.message ?? "create failed"}` });
      }
      await admin
        .from("tickets")
        .update({
          github_issue_number: data.number,
          github_issue_node_id: data.node_id,
        })
        .eq("id", ticket_id);

      if (state === "closed") {
        await fetch(`${GITHUB_API}/repos/${repoPath}/issues/${data.number}`, {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ state: "closed" }),
        });
      }
      return json(200, { ok: true, action: "created", issue_number: data.number, html_url: data.html_url });
    } else {
      const res = await fetch(
        `${GITHUB_API}/repos/${repoPath}/issues/${ticket.github_issue_number}`,
        {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ title, body, assignees: githubUsernames, state, labels }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        console.error("GitHub update failed", res.status, data);
        return json(502, { ok: false, error: `GitHub ${res.status}: ${data?.message ?? "update failed"}` });
      }
      return json(200, { ok: true, action: "updated", issue_number: data.number, html_url: data.html_url });
    }
  } catch (e) {
    console.error("github-sync-ticket error", e);
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
