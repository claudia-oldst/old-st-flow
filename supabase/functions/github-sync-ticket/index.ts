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
}

interface Project {
  id: string;
  github_owner: string | null;
  github_repo: string | null;
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

    // Validate caller
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

    // RLS check via the user's client — confirms they can access the ticket
    const { data: accessCheck, error: accessErr } = await userClient
      .from("tickets")
      .select("id")
      .eq("id", ticket_id)
      .maybeSingle();
    if (accessErr || !accessCheck) {
      return json(403, { error: "No access to this ticket" });
    }

    // Load ticket
    const { data: ticket, error: tErr } = await admin
      .from("tickets")
      .select("id, project_id, formatted_id, title, acceptance_criteria, status_id, github_issue_number, github_issue_node_id")
      .eq("id", ticket_id)
      .single<Ticket>();
    if (tErr || !ticket) return json(404, { error: "Ticket not found" });

    // Load project repo config
    const { data: project } = await admin
      .from("projects")
      .select("id, github_owner, github_repo")
      .eq("id", ticket.project_id)
      .single<Project>();

    if (!project?.github_owner || !project?.github_repo) {
      return json(200, { ok: true, skipped: "no_repo" });
    }

    // Load assignees → GitHub usernames
    const { data: assignees } = await admin
      .from("ticket_assignees")
      .select("user_id, slot")
      .eq("ticket_id", ticket_id);

    const userIds = (assignees ?? []).map((a) => a.user_id);
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

    // Status → state
    let state: "open" | "closed" = "open";
    if (ticket.status_id) {
      const { data: status } = await admin
        .from("statuses")
        .select("category")
        .eq("id", ticket.status_id)
        .maybeSingle();
      if (status?.category === "done") state = "closed";
    }

    const title = `[${ticket.formatted_id}] ${ticket.title}`;
    const bodyParts: string[] = [];
    if (ticket.acceptance_criteria) {
      bodyParts.push("### Acceptance Criteria\n", ticket.acceptance_criteria);
    }
    bodyParts.push(`\n\n_Synced from Lovable — ticket ${ticket.formatted_id}_`);
    const body = bodyParts.join("\n");

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    const repoPath = `${project.github_owner}/${project.github_repo}`;

    if (ticket.github_issue_number == null) {
      // Create
      const res = await fetch(`${GITHUB_API}/repos/${repoPath}/issues`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ title, body, assignees: githubUsernames }),
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

      // If status is closed, immediately close (POST create doesn't accept state)
      if (state === "closed") {
        await fetch(`${GITHUB_API}/repos/${repoPath}/issues/${data.number}`, {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ state: "closed" }),
        });
      }
      return json(200, { ok: true, action: "created", issue_number: data.number, html_url: data.html_url });
    } else {
      // Update existing
      const res = await fetch(
        `${GITHUB_API}/repos/${repoPath}/issues/${ticket.github_issue_number}`,
        {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ title, body, assignees: githubUsernames, state }),
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
