/**
 * Mock Supabase client (recipe 2A) for VITE_MOCK=true. Implements the chainable
 * PostgREST query-builder surface, RPC handlers (exact real shapes + real ids),
 * a stable signed-in auth session, and no-op storage/functions/realtime stubs —
 * all resolving against the in-memory fixtures in ./data.
 *
 * See .claude/skills/source-mock-data-system/SKILL.md §2A.
 */
import {
  EMBEDS,
  MOCK_SESSION,
  firstStatusInCategory,
  getTable,
  inferEmbed,
  mockTeamMember,
  rpcGetClientPortal,
  rpcGetClientPortalChangeRequests,
  rpcListProjectTickets,
} from "./data";

const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

// ---- select-string parser -------------------------------------------------

interface SelectTree {
  star: boolean;
  columns: string[];
  embeds: Array<{ alias: string; target: string; inner: boolean; tree: SelectTree }>;
}

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function parseSelect(sel: string | undefined): SelectTree {
  const tree: SelectTree = { star: false, columns: [], embeds: [] };
  if (!sel || sel.trim() === "*" || sel.trim() === "") {
    tree.star = true;
    return tree;
  }
  for (const rawTok of splitTopLevel(sel)) {
    const tok = rawTok.trim();
    if (!tok) continue;
    const paren = tok.indexOf("(");
    if (paren === -1) {
      if (tok === "*") tree.star = true;
      else tree.columns.push(tok.split(":").pop()!.trim());
      continue;
    }
    const head = tok.slice(0, paren).trim();
    const inner = tok.slice(paren + 1, tok.lastIndexOf(")"));
    let alias: string;
    let targetSpec: string;
    if (head.includes(":")) {
      [alias, targetSpec] = head.split(":");
    } else {
      alias = head;
      targetSpec = head;
    }
    const isInner = /!inner/i.test(targetSpec);
    const target = targetSpec.split("!")[0].trim();
    tree.embeds.push({ alias: alias.trim(), target, inner: isInner, tree: parseSelect(inner) });
  }
  return tree;
}

function projectRow(row: any, tree: SelectTree, table: string): { value: any; drop: boolean } {
  const out: any = {};
  let drop = false;
  if (tree.star) Object.assign(out, row);
  for (const col of tree.columns) out[col] = row[col];

  for (const emb of tree.embeds) {
    const rel = EMBEDS[`${table}.${emb.alias}`] ?? inferEmbed(table, emb.alias, emb.target);
    if (rel.kind === "one") {
      const child = getTable(rel.table).find((c) => c[rel.foreignKey] === row[rel.localKey]) ?? null;
      out[emb.alias] = child ? projectRow(child, emb.tree, rel.table).value : null;
      if (emb.inner && !child) drop = true;
    } else {
      const children = getTable(rel.table).filter((c) => c[rel.foreignKey] === row[rel.localKey]);
      out[emb.alias] = children.map((c) => projectRow(c, emb.tree, rel.table).value);
    }
  }
  return { value: out, drop };
}

// ---- filter helpers --------------------------------------------------------

const ilikeToRe = (pat: string) =>
  new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");

interface Filter {
  type: "eq" | "neq" | "in" | "ilike" | "is" | "gt" | "gte" | "lt" | "lte" | "or";
  col?: string;
  val?: any;
  ors?: Array<{ col: string; op: string; val: string }>;
}

/**
 * Resolve a dotted filter column (PostgREST embedded-resource filter, e.g.
 * `ticket.project_id`) against a base row by walking the to-one embed registry.
 * Returns undefined when the embed (or any path segment) is missing — which makes
 * an `eq` filter fail, matching `!inner` join semantics (rows without a match drop).
 */
function embedValue(table: string, row: any, dottedCol: string): any {
  const [alias, ...rest] = dottedCol.split(".");
  const rel = EMBEDS[`${table}.${alias}`] ?? inferEmbed(table, alias, alias);
  if (rel.kind !== "one") return undefined;
  const child = getTable(rel.table).find((c) => c[rel.foreignKey] === row[rel.localKey]);
  let v: any = child ?? undefined;
  for (const k of rest) v = v == null ? undefined : v[k];
  return v;
}

function scalarMatch(type: Filter["type"], a: any, b: any): boolean {
  switch (type) {
    case "eq": return a === b;
    case "neq": return a !== b;
    case "in": return (b as any[]).includes(a);
    case "is": return b === null ? a == null : a === b;
    case "gt": return a > b;
    case "gte": return a >= b;
    case "lt": return a < b;
    case "lte": return a <= b;
    case "ilike": return ilikeToRe(String(b)).test(String(a ?? ""));
    default: return false;
  }
}

function rowMatches(row: any, f: Filter): boolean {
  switch (f.type) {
    case "eq":
      return row[f.col!] === f.val;
    case "neq":
      return row[f.col!] !== f.val;
    case "in":
      return (f.val as any[]).includes(row[f.col!]);
    case "ilike":
      return ilikeToRe(String(f.val)).test(String(row[f.col!] ?? ""));
    case "is":
      return f.val === null ? row[f.col!] == null : row[f.col!] === f.val;
    case "gt":
      return row[f.col!] > f.val;
    case "gte":
      return row[f.col!] >= f.val;
    case "lt":
      return row[f.col!] < f.val;
    case "lte":
      return row[f.col!] <= f.val;
    case "or":
      return f.ors!.some((c) => {
        if (c.op === "ilike") return ilikeToRe(c.val).test(String(row[c.col] ?? ""));
        if (c.op === "eq") return String(row[c.col]) === c.val;
        if (c.op === "is") return c.val === "null" ? row[c.col] == null : row[c.col] === c.val;
        return false;
      });
  }
}

// ---- query builder ---------------------------------------------------------

class MockQueryBuilder implements PromiseLike<any> {
  private filters: Filter[] = [];
  private selectStr = "*";
  private orderBy: Array<{ col: string; ascending: boolean; nullsFirst?: boolean }> = [];
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private limitN: number | null = null;
  private single: "none" | "one" | "maybe" = "none";
  private wantCount = false;
  private headOnly = false;
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: any = null;
  private onConflict: string | null = null;

  constructor(private table: string) {}

  // chainable filters
  eq(col: string, val: any) { this.filters.push({ type: "eq", col, val }); return this; }
  neq(col: string, val: any) { this.filters.push({ type: "neq", col, val }); return this; }
  in(col: string, val: any[]) { this.filters.push({ type: "in", col, val }); return this; }
  ilike(col: string, val: string) { this.filters.push({ type: "ilike", col, val }); return this; }
  is(col: string, val: any) { this.filters.push({ type: "is", col, val }); return this; }
  not() { return this; }
  gt(col: string, val: any) { this.filters.push({ type: "gt", col, val }); return this; }
  gte(col: string, val: any) { this.filters.push({ type: "gte", col, val }); return this; }
  lt(col: string, val: any) { this.filters.push({ type: "lt", col, val }); return this; }
  lte(col: string, val: any) { this.filters.push({ type: "lte", col, val }); return this; }
  contains() { return this; }
  or(str: string) {
    const ors = splitTopLevel(str).map((part) => {
      const [col, op, ...rest] = part.trim().split(".");
      return { col, op, val: rest.join(".") };
    });
    this.filters.push({ type: "or", ors });
    return this;
  }

  select(str?: string, opts?: { count?: string; head?: boolean }) {
    if (str !== undefined) this.selectStr = str;
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderBy.push({ col, ascending: opts?.ascending !== false, nullsFirst: opts?.nullsFirst });
    return this;
  }
  range(from: number, to: number) { this.rangeFrom = from; this.rangeTo = to; return this; }
  limit(n: number) { this.limitN = n; return this; }
  maybeSingle() { this.single = "maybe"; return this; }
  single() { this.single = "one"; return this; }

  // mutations
  insert(payload: any) { this.op = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.op = "update"; this.payload = payload; return this; }
  upsert(payload: any, opts?: { onConflict?: string }) {
    this.op = "upsert"; this.payload = payload; this.onConflict = opts?.onConflict ?? null; return this;
  }
  delete() { this.op = "delete"; return this; }

  private applyFilters(rows: any[]) {
    return rows.filter((r) =>
      this.filters.every((f) => {
        // Dotted column → filter on an embedded to-one resource (PostgREST `!inner`).
        if (f.col && f.col.includes(".")) {
          return scalarMatch(f.type, embedValue(this.table, r, f.col), f.val);
        }
        return rowMatches(r, f);
      }),
    );
  }

  private resolve(): { data: any; error: any; count: number | null } {
    const tableRows = getTable(this.table);
    const tree = parseSelect(this.selectStr);

    if (this.op === "select") {
      let rows = this.applyFilters(tableRows);
      const count = this.wantCount ? rows.length : null;
      for (const o of [...this.orderBy].reverse()) {
        rows = [...rows].sort((a, b) => {
          const av = a[o.col];
          const bv = b[o.col];
          if (av == bv) return 0;
          if (av == null) return o.nullsFirst ? -1 : 1;
          if (bv == null) return o.nullsFirst ? 1 : -1;
          return (av < bv ? -1 : 1) * (o.ascending ? 1 : -1);
        });
      }
      if (this.rangeFrom != null) rows = rows.slice(this.rangeFrom, (this.rangeTo ?? rows.length) + 1);
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      if (this.headOnly) return { data: null, error: null, count };
      const projected = rows.map((r) => projectRow(r, tree, this.table)).filter((p) => !p.drop).map((p) => p.value);
      return this.finishSingle(projected, count);
    }

    // mutations
    let affected: any[] = [];
    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const item of items) {
        const row = { ...item };
        if (this.op === "upsert" && this.onConflict) {
          const keys = this.onConflict.split(",").map((k) => k.trim());
          const existing = tableRows.find((r) => keys.every((k) => r[k] === row[k]));
          if (existing) { Object.assign(existing, row); affected.push(existing); continue; }
        }
        if (!("id" in row) && "id" in (tableRows[0] ?? { id: 1 })) {
          // only synthesize id when the table appears to use a string id
          if (typeof (tableRows[0]?.id) !== "number") row.id = uuid();
        }
        if (!("created_at" in row)) row.created_at = new Date().toISOString();
        tableRows.push(row);
        affected.push(row);
      }
    } else if (this.op === "update") {
      affected = this.applyFilters(tableRows);
      affected.forEach((r) => Object.assign(r, this.payload, { updated_at: new Date().toISOString() }));
    } else if (this.op === "delete") {
      affected = this.applyFilters(tableRows);
      for (const r of affected) {
        const i = tableRows.indexOf(r);
        if (i >= 0) tableRows.splice(i, 1);
      }
    }
    const projected = affected.map((r) => projectRow(r, tree, this.table).value);
    return this.finishSingle(projected, this.wantCount ? affected.length : null);
  }

  private finishSingle(rows: any[], count: number | null) {
    if (this.single === "one") {
      if (rows.length === 0)
        return { data: null, error: { message: "No rows", code: "PGRST116" }, count };
      return { data: rows[0], error: null, count };
    }
    if (this.single === "maybe") return { data: rows[0] ?? null, error: null, count };
    return { data: rows, error: null, count };
  }

  then<T1 = any, T2 = never>(
    onF?: ((v: { data: any; error: any; count: number | null }) => T1 | PromiseLike<T1>) | null,
    onR?: ((reason: any) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    try {
      return Promise.resolve(this.resolve()).then(onF, onR);
    } catch (e) {
      return Promise.resolve({ data: null, error: { message: String(e) }, count: null }).then(onF, onR);
    }
  }
}

// ---- RPC dispatch ----------------------------------------------------------

async function handleRpc(fn: string, params: any): Promise<{ data: any; error: any }> {
  const tm = mockTeamMember();
  switch (fn) {
    case "list_project_tickets":
      return { data: rpcListProjectTickets(params), error: null };
    case "get_client_portal":
      return { data: rpcGetClientPortal(params, false), error: null };
    case "get_project_portal_preview":
      return { data: rpcGetClientPortal(params, true), error: null };
    case "get_client_portal_change_requests":
      return { data: rpcGetClientPortalChangeRequests(params), error: null };
    case "client_approve_cr": {
      const t = getTable("tickets").find((x) => x.id === params._ticket_id);
      if (t) { t.cr_approval = "approved"; t.cr_decided_at = new Date().toISOString(); }
      return { data: true, error: null };
    }
    case "current_team_member_id":
      return { data: tm?.id ?? null, error: null };
    case "current_is_pmba":
    case "is_pmba":
      return { data: (tm?.role ?? "") === "PMBA", error: null };
    case "current_is_project_member":
    case "current_can_access_ticket":
    case "has_role":
      return { data: true, error: null };
    case "first_status_in_category":
      return { data: firstStatusInCategory(params?._cat), error: null };
    case "reapply_status_rules":
    case "enqueue_github_sync":
      return { data: null, error: null };
    case "rotate_client_portal_hash":
      return { data: uuid().replace(/-/g, "") + uuid().replace(/-/g, ""), error: null };
    case "get_project_archive_payload":
    case "rehydrate_project":
    case "purge_project_children":
      return { data: { ok: true }, error: null };
    default:
      return { data: null, error: null };
  }
}

// ---- auth ------------------------------------------------------------------

const auth = {
  getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
  getUser: async () => ({ data: { user: MOCK_SESSION.user }, error: null }),
  onAuthStateChange: (cb: (event: string, session: any) => void) => {
    setTimeout(() => cb("INITIAL_SESSION", MOCK_SESSION), 0);
    return { data: { subscription: { id: "mock-sub", callback: cb, unsubscribe() {} } } };
  },
  signInWithOAuth: async () => ({ data: { provider: "google", url: "#mock" }, error: null }),
  signInWithPassword: async () => ({ data: { session: MOCK_SESSION, user: MOCK_SESSION.user }, error: null }),
  signOut: async () => ({ error: null }),
  updateUser: async () => ({ data: { user: MOCK_SESSION.user }, error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
};

// ---- storage ---------------------------------------------------------------

const storage = {
  from: (_bucket: string) => ({
    upload: async (path: string) => ({ data: { path, id: uuid(), fullPath: `${_bucket}/${path}` }, error: null }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `#mock/${path}` }, error: null }),
    createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ signedUrl: `#mock/${p}`, path: p, error: null })), error: null }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `#mock/${path}` } }),
    remove: async () => ({ data: [], error: null }),
    download: async () => ({ data: new Blob([]), error: null }),
  }),
};

// ---- edge functions --------------------------------------------------------

const functions = {
  invoke: async (name: string, _opts?: { body?: any }) => {
    switch (name) {
      case "archive-project":
        return { data: { ok: true, vault_storage_path: "vault/mock.json", checksum: "sha256:mock", counts: {}, cached_total_hours: 0, cached_total_cost: 0 }, error: null };
      case "vault-download-url":
        return { data: { url: "#mock-vault-download" }, error: null };
      case "rehydrate-project":
        return { data: { ok: true }, error: null };
      case "epic-summary":
        return { data: { draft: "This epic saw scope changes this cycle; net effort increased. (mock AI draft)" }, error: null };
      case "daily-logoff-summary":
        return { data: { summary: "Today the team progressed several tickets across FE and BE. (mock AI summary)" }, error: null };
      case "generate-acceptance-criteria":
        return { data: { draft: "Given a user\nWhen they act\nThen the system responds. (mock AC)" }, error: null };
      case "github-sync-ticket":
        return { data: { ok: true, action: "skipped" }, error: null };
      default:
        return { data: { ok: true }, error: null };
    }
  },
};

// ---- realtime (no-op) ------------------------------------------------------

function channel(_name: string) {
  const ch: any = {
    on: () => ch,
    subscribe: (cb?: (status: string) => void) => {
      if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
      return ch;
    },
    unsubscribe: async () => "ok",
    send: async () => "ok",
  };
  return ch;
}

export const mockSupabase = {
  from: (table: string) => new MockQueryBuilder(table),
  rpc: (fn: string, params?: any) => {
    // Return a thenable so both `await supabase.rpc(...)` and `.then()` work.
    return { then: (onF: any, onR: any) => handleRpc(fn, params).then(onF, onR) };
  },
  channel,
  removeChannel: async () => "ok",
  removeAllChannels: async () => "ok",
  getChannels: () => [],
  auth,
  storage,
  functions,
};

export type MockSupabase = typeof mockSupabase;
