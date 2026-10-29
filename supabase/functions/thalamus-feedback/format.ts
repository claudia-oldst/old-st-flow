// Renders a Thalamus report into the first discussion comment (markdown).
export type ThalamusReport = {
  type?: string | null;
  description?: string | null;
  page_url?: string | null;
  site?: { name?: string | null; origin?: string | null } | null;
  reporter?: { name?: string | null; email?: string | null } | null;
  environment?: { user_agent?: string | null; viewport?: string | null; app_version?: string | null } | null;
  diagnostics?: {
    console_logs?: Array<{ level?: string; message?: string; timestamp?: string }> | null;
    network_errors?: Array<{ url?: string; method?: string; status?: number; statusText?: string }> | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

const MAX_LINES = 20;
const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n) + "…" : s);

export function suggestedType(type?: string | null): "Bug" | "CR" | "Standard" {
  const t = (type ?? "").toLowerCase();
  return t === "bug" ? "Bug" : t === "feature" ? "CR" : "Standard";
}

export function renderReport(r: ThalamusReport): string {
  const who = r.reporter?.name?.trim() || "Anonymous";
  const email = r.reporter?.email?.trim();
  const parts: string[] = [
    `📥 Submitted via Thalamus by ${who}${email ? ` (${email})` : ""} · suggested type: ${suggestedType(r.type)}`,
  ];
  if (r.description?.trim()) parts.push(r.description.trim());
  const ctx = [
    r.site?.name && `Site: ${r.site.name}${r.site.origin ? ` (${r.site.origin})` : ""}`,
    r.page_url && `Page: ${r.page_url}`,
    r.environment?.viewport && `Viewport: ${r.environment.viewport}`,
    r.environment?.app_version && `App version: ${r.environment.app_version}`,
    r.environment?.user_agent && `User agent: ${r.environment.user_agent}`,
  ].filter(Boolean);
  if (ctx.length) parts.push(`**Context**\n${ctx.map((l) => `- ${l}`).join("\n")}`);
  const logs = (r.diagnostics?.console_logs ?? []).slice(0, MAX_LINES);
  if (logs.length) parts.push("**Console**\n```\n" + logs.map((l) => `[${l.level ?? "log"}] ${clip(l.message ?? "")}`).join("\n") + "\n```");
  const net = (r.diagnostics?.network_errors ?? []).slice(0, MAX_LINES);
  if (net.length) parts.push("**Network errors**\n```\n" + net.map((n) => `${n.method ?? "GET"} ${n.url ?? ""} → ${n.status ?? "?"} ${n.statusText ?? ""}`.trim()).join("\n") + "\n```");
  const meta = r.diagnostics?.metadata;
  if (meta && Object.keys(meta).length) parts.push("**Metadata**\n```\n" + JSON.stringify(meta, null, 2) + "\n```");
  return parts.join("\n\n");
}
