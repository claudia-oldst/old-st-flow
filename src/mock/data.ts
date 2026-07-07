/**
 * Mock data store for the source-app mock (VITE_MOCK=true).
 *
 * Loads every JSON fixture under ./fixtures into an in-memory, MUTABLE store so
 * the app can read AND write (insert/update/delete) during a screenshot session
 * without a live backend. Fixtures are snake_case rows matching the Supabase
 * `Row` types in src/integrations/supabase/types.ts.
 *
 * Rules (see .claude/skills/source-mock-data-system/SKILL.md §4):
 *  - preserve REAL ids from the fixtures through every handler (never re-index),
 *  - derive counts/rollups from the actual rows (never hardcode 0).
 */

// Eagerly import all fixtures; resilient to the exact file set.
const modules = import.meta.glob("./fixtures/*.json", { eager: true, import: "default" });

const clone = <T>(v: T): T =>
  typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

const db: Record<string, any[]> = {};
for (const [path, rows] of Object.entries(modules)) {
  const name = path.split("/").pop()!.replace(/\.json$/, "");
  db[name] = clone(Array.isArray(rows) ? rows : []);
}

export function getTable(name: string): any[] {
  if (!db[name]) db[name] = [];
  return db[name];
}

/** The signed-in mock identity. Dennis (PMBA) — matches team_members.auth_user_id. */
export const MOCK_AUTH_UID = "9a000000-0000-4000-8000-000000000001";

export const MOCK_SESSION = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800, // 2100-01-01, never expires during a session
  user: {
    id: MOCK_AUTH_UID,
    aud: "authenticated",
    role: "authenticated",
    email: "dennis@old.st",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Dennis", email: "dennis@old.st" },
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
};

export function mockTeamMember() {
  return getTable("team_members").find((m) => m.auth_user_id === MOCK_AUTH_UID) ?? getTable("team_members")[0] ?? null;
}

/**
 * Embed (PostgREST join) registry. Key: `${parentTable}.${alias}`.
 *   kind 'one'  → parent.localKey === child.foreignKey, attach a single row
 *   kind 'many' → child.foreignKey === parent.localKey, attach an array
 */
export const EMBEDS: Record<string, { table: string; kind: "one" | "many"; localKey: string; foreignKey: string }> = {
  "tickets.epic": { table: "project_epics", kind: "one", localKey: "epic_id", foreignKey: "id" },
  "tickets.assignees": { table: "ticket_assignees", kind: "many", localKey: "id", foreignKey: "ticket_id" },
  "tickets.parent": { table: "tickets", kind: "one", localKey: "parent_ticket_id", foreignKey: "id" },
  "sprint_tickets.sprint": { table: "sprints", kind: "one", localKey: "sprint_id", foreignKey: "id" },
  "ticket_assignees.member": { table: "team_members", kind: "one", localKey: "user_id", foreignKey: "id" },
  "project_members.member": { table: "team_members", kind: "one", localKey: "user_id", foreignKey: "id" },
  "ticket_comments.author": { table: "team_members", kind: "one", localKey: "user_id", foreignKey: "id" },
  "time_logs.user": { table: "team_members", kind: "one", localKey: "user_id", foreignKey: "id" },
  "ticket_estimate_changes.requester": { table: "team_members", kind: "one", localKey: "user_id", foreignKey: "id" },
  "ticket_estimate_changes.ticket": { table: "tickets", kind: "one", localKey: "ticket_id", foreignKey: "id" },
};

/** Best-effort fallback when an alias isn't in EMBEDS. */
export function inferEmbed(parentTable: string, alias: string, targetTable: string) {
  const child = getTable(targetTable);
  const parent = getTable(parentTable);
  const parentSingular = parentTable.replace(/s$/, "");
  // child has a FK back to parent → one-to-many
  for (const fk of [`${parentSingular}_id`, `${parentTable}_id`]) {
    if (child[0] && fk in child[0]) return { table: targetTable, kind: "many" as const, localKey: "id", foreignKey: fk };
  }
  // parent has a FK to child → to-one
  const targetSingular = targetTable.replace(/s$/, "");
  for (const fk of [`${alias}_id`, `${targetSingular}_id`, `${targetTable}_id`]) {
    if (parent[0] && fk in parent[0]) return { table: targetTable, kind: "one" as const, localKey: fk, foreignKey: "id" };
  }
  return { table: targetTable, kind: "one" as const, localKey: `${alias}_id`, foreignKey: "id" };
}

const statusCategory = (statusId: string | null): string | null => {
  if (!statusId) return null;
  return getTable("statuses").find((s) => s.id === statusId)?.category ?? null;
};

// ---- RPC compute helpers ---------------------------------------------------

export function rpcListProjectTickets(params: any) {
  const {
    _project_id,
    _filters = {},
    _search = null,
    _sort_col = "position",
    _sort_dir = "asc",
    _page = 1,
    _page_size = 100,
  } = params ?? {};

  let rows = getTable("tickets").filter((t) => t.project_id === _project_id);

  if (_search) {
    const q = String(_search).toLowerCase();
    rows = rows.filter(
      (t) => String(t.formatted_id).toLowerCase().includes(q) || String(t.title).toLowerCase().includes(q),
    );
  }
  const f = _filters || {};
  if (f.ticket_type) rows = rows.filter((t) => t.ticket_type === f.ticket_type);
  if (f.epic_id != null) rows = rows.filter((t) => t.epic_id === f.epic_id);
  if (f.fe_status) rows = rows.filter((t) => t.fe_status === f.fe_status);
  if (f.be_status) rows = rows.filter((t) => t.be_status === f.be_status);
  if (f.status_id) rows = rows.filter((t) => t.status_id === f.status_id);

  const dir = _sort_dir === "desc" ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    const av = a[_sort_col];
    const bv = b[_sort_col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  const total = rows.length;
  const start = (Math.max(1, _page) - 1) * _page_size;
  const page = rows.slice(start, start + _page_size);

  const epics = getTable("project_epics");
  const assignees = getTable("ticket_assignees");
  const members = getTable("team_members");

  const enriched = page.map((t) => ({
    ...t,
    epic: t.epic_id != null ? { epic_name: epics.find((e) => e.id === t.epic_id)?.epic_name ?? null } : null,
    assignees: assignees
      .filter((a) => a.ticket_id === t.id)
      .map((a) => ({
        user_id: a.user_id,
        slot: a.slot,
        created_at: a.created_at,
        member: members.find((m) => m.id === a.user_id) ?? null,
      })),
  }));

  return { total, rows: enriched };
}

function buildPortalTotals(projectId: string) {
  const tickets = getTable("tickets").filter((t) => t.project_id === projectId);
  const proj = getTable("projects").find((p) => p.id === projectId);
  const rate = proj?.rate_per_hour ?? 0;
  const sum = (fn: (t: any) => number) => tickets.reduce((acc, t) => acc + (fn(t) || 0), 0);
  const countCat = (cat: string) => tickets.filter((t) => statusCategory(t.status_id) === cat).length;
  const countFe = (s: string) => tickets.filter((t) => t.fe_status === s).length;
  const countBe = (s: string) => tickets.filter((t) => t.be_status === s).length;

  const fe_estimate = sum((t) => Number(t.current_fe_estimate ?? 0));
  const be_estimate = sum((t) => Number(t.current_be_estimate ?? 0));
  const proj_estimate = sum((t) => Number(t.current_project_estimate ?? 0));
  const original_total =
    sum((t) => Number(t.original_fe_estimate ?? 0)) +
    sum((t) => Number(t.original_be_estimate ?? 0)) +
    sum((t) => Number(t.original_project_estimate ?? 0));
  const current_total = fe_estimate + be_estimate + proj_estimate;
  const fe_actual = sum((t) => Number(t.actual_frontend_hours ?? 0));
  const be_actual = sum((t) => Number(t.actual_backend_hours ?? 0));
  const proj_actual = sum((t) => Number(t.actual_project_hours ?? 0));
  const actual_total = fe_actual + be_actual + proj_actual;

  return {
    tickets_total: tickets.length,
    tickets_backlog: countCat("backlog"),
    tickets_in_progress: countCat("active"),
    tickets_done: countCat("dev done") + countCat("done"),
    fe_actual,
    be_actual,
    proj_actual,
    fe_estimate,
    be_estimate,
    proj_estimate,
    fe_done: countFe("done"),
    fe_in_progress: countFe("in_progress"),
    fe_todo: countFe("todo"),
    be_done: countBe("done"),
    be_in_progress: countBe("in_progress"),
    be_todo: countBe("todo"),
    original_total,
    current_total,
    actual_total,
    cost_actual: actual_total * rate,
    cost_estimate: current_total * rate,
  };
}

function buildPortalEpics(projectId: string) {
  const tickets = getTable("tickets").filter((t) => t.project_id === projectId);
  const summaries = getTable("project_epic_summaries").filter((s) => s.project_id === projectId);
  return getTable("project_epics")
    .filter((e) => e.project_id === projectId)
    .map((e) => {
      const et = tickets.filter((t) => t.epic_id === e.id);
      const s = summaries.find((x) => x.epic_id === e.id);
      const sum = (fn: (t: any) => number) => et.reduce((acc, t) => acc + (fn(t) || 0), 0);
      const cat = (c: string) => et.filter((t) => statusCategory(t.status_id) === c).length;
      return {
        id: e.id,
        epic_name: e.epic_name,
        total_tickets: et.length,
        backlog_tickets: cat("backlog"),
        in_progress_tickets: cat("active"),
        done_tickets: cat("dev done") + cat("done"),
        current_estimate:
          sum((t) => Number(t.current_fe_estimate ?? 0)) +
          sum((t) => Number(t.current_be_estimate ?? 0)) +
          sum((t) => Number(t.current_project_estimate ?? 0)),
        original_estimate:
          sum((t) => Number(t.original_fe_estimate ?? 0)) +
          sum((t) => Number(t.original_be_estimate ?? 0)) +
          sum((t) => Number(t.original_project_estimate ?? 0)),
        actual_hours:
          sum((t) => Number(t.actual_frontend_hours ?? 0)) +
          sum((t) => Number(t.actual_backend_hours ?? 0)) +
          sum((t) => Number(t.actual_project_hours ?? 0)),
        pmba_text: s?.pmba_text ?? null,
        ai_draft: s?.ai_draft ?? null,
        included: s?.included ?? null,
      };
    });
}

function projectByHashOrId({ hash, id }: { hash?: string; id?: string }) {
  return getTable("projects").find((p) => (hash ? p.client_portal_hash === hash : p.id === id)) ?? null;
}

export function rpcGetClientPortal(params: any, byId = false) {
  const proj = byId
    ? projectByHashOrId({ id: params._project_id })
    : projectByHashOrId({ hash: params._hash });
  if (!proj) return null;
  return {
    project: {
      id: proj.id,
      name: proj.name,
      acronym: proj.acronym,
      client_name: proj.client_name ?? null,
      cutoff: params._cutoff ?? proj.client_visibility_cutoff ?? new Date().toISOString(),
      rate_per_hour: proj.rate_per_hour ?? 0,
      summary: proj.client_summary_published ?? proj.client_summary_draft ?? null,
      summary_updated_at: proj.client_summary_updated_at ?? null,
    },
    totals: buildPortalTotals(proj.id),
    epics: buildPortalEpics(proj.id),
  };
}

export function rpcGetClientPortalChangeRequests(params: any) {
  const proj = projectByHashOrId({ hash: params._hash });
  if (!proj) return null;
  const tickets = getTable("tickets").filter((t) => t.project_id === proj.id);
  const pick = (t: any) => ({
    id: t.id,
    epic_id: t.epic_id ?? null,
    original_fe_estimate: Number(t.original_fe_estimate ?? 0),
    original_be_estimate: Number(t.original_be_estimate ?? 0),
    original_project_estimate: Number(t.original_project_estimate ?? 0),
    current_fe_estimate: Number(t.current_fe_estimate ?? 0),
    current_be_estimate: Number(t.current_be_estimate ?? 0),
    current_project_estimate: Number(t.current_project_estimate ?? 0),
    actual_frontend_hours: Number(t.actual_frontend_hours ?? 0),
    actual_backend_hours: Number(t.actual_backend_hours ?? 0),
    actual_project_hours: Number(t.actual_project_hours ?? 0),
  });
  return {
    project: { id: proj.id, acronym: proj.acronym, name: proj.name },
    epics: getTable("project_epics")
      .filter((e) => e.project_id === proj.id)
      .map((e) => ({ id: e.id, epic_name: e.epic_name })),
    baseline_tickets: tickets.filter((t) => t.ticket_type !== "CR").map(pick),
    cr_tickets: tickets
      .filter((t) => t.ticket_type === "CR")
      .map((t) => ({
        ...pick(t),
        formatted_id: t.formatted_id,
        title: t.title,
        ticket_type: "CR" as const,
        acceptance_criteria: t.acceptance_criteria ?? null,
        cr_approval: (t.cr_approval ?? "pending") as "pending" | "approved" | "rejected",
        cr_decided_at: t.cr_decided_at ?? null,
        created_at: t.created_at,
      })),
  };
}

export function firstStatusInCategory(cat: string): string | null {
  return (
    getTable("statuses")
      .filter((s) => s.category === cat)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.id ?? null
  );
}
