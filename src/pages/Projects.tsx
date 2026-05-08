import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, FolderKanban, Search, X, Archive } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/ListPagination";
import { PAGE_SIZES } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type StatusFilter = "active" | "vaulted" | "all";
type SortKey = "newest" | "oldest" | "name" | "archived";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Projects() {
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const status = (params.get("status") as StatusFilter) || "active";
  const sort = (params.get("sort") as SortKey) || "newest";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const debouncedQ = useDebounced(q, 200);

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [creating, setCreating] = useState(false);
  const [counts, setCounts] = useState<Record<string, { tickets: number; members: number }>>({});
  const pageSize = PAGE_SIZES.projects;

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (!value) next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.delete("page"); // reset page on filter changes
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // Reset page when filters/search change
  useEffect(() => {
    if (page !== 1 && (debouncedQ || status !== "active")) {
      // handled in setParam
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, status, sort]);

  const load = useCallback(async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("projects").select("*", { count: "exact" });

    if (status === "active") query = query.eq("is_archived", false);
    else if (status === "vaulted") query = query.eq("is_archived", true);

    const term = debouncedQ.trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(
        `name.ilike.${like},acronym.ilike.${like},client_name.ilike.${like}`,
      );
    }

    switch (sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "name":
        query = query.order("name", { ascending: true });
        break;
      case "archived":
        query = query.order("archived_at", { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data, count } = await query.range(from, to);
    setProjects(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);

    if (data && data.length) {
      const entries = await Promise.all(
        data.map(async (p) => {
          if (p.is_archived) return [p.id, { tickets: 0, members: 0 }] as const;
          const [{ count: tCount }, { count: mCount }] = await Promise.all([
            supabase.from("tickets").select("id", { count: "exact", head: true }).eq("project_id", p.id),
            supabase.from("project_members").select("user_id", { count: "exact", head: true }).eq("project_id", p.id),
          ]);
          return [p.id, { tickets: tCount ?? 0, members: mCount ?? 0 }] as const;
        }),
      );
      setCounts(Object.fromEntries(entries));
    } else {
      setCounts({});
    }
  }, [page, pageSize, status, sort, debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    [{ table: "projects" }, { table: "tickets" }, { table: "project_members" }],
    load,
  );

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const trimmedAcr = acronym.trim().toUpperCase();
    if (!trimmedName) return toast.error("Project name required");
    if (!/^[A-Z]{3,5}$/.test(trimmedAcr)) return toast.error("Acronym must be 3–5 letters");

    setCreating(true);
    const { error } = await supabase.from("projects").insert({ name: trimmedName, acronym: trimmedAcr });
    setCreating(false);
    if (error) {
      if (error.message.includes("duplicate")) toast.error(`Acronym "${trimmedAcr}" is taken`);
      else toast.error(error.message);
      return;
    }
    toast.success("Project created");
    setOpen(false);
    setName("");
    setAcronym("");
    setParam("page", null);
    load();
  };

  const hasFilters = !!debouncedQ || status !== "active" || sort !== "newest";
  const clearFilters = () => {
    setQ("");
    const next = new URLSearchParams();
    setParams(next, { replace: true });
  };

  const sortOptions = useMemo(() => {
    const opts: Array<{ value: SortKey; label: string }> = [
      { value: "newest", label: "Newest" },
      { value: "oldest", label: "Oldest" },
      { value: "name", label: "Name A→Z" },
    ];
    if (status !== "active") opts.push({ value: "archived", label: "Recently archived" });
    return opts;
  }, [status]);

  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">Workspace</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-dim mt-1">Active client engagements and internal builds.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Redesign" />
              </div>
              <div className="space-y-2">
                <Label>Acronym <span className="text-dimmer">(3–5 letters, used in ticket IDs)</span></Label>
                <Input
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="ACME"
                  className="font-mono uppercase"
                  maxLength={5}
                />
                {acronym.length >= 3 && (
                  <div className="text-xs text-dim">Tickets will be numbered <span className="font-mono text-foreground">{acronym}-001</span>, <span className="font-mono text-foreground">{acronym}-002</span>…</div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>Create project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dimmer pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setParam("q", e.target.value || null);
            }}
            placeholder="Search by name, acronym, or client…"
            className="pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); setParam("q", null); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={status} onValueChange={(v) => setParam("status", v === "active" ? null : v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="vaulted">Vaulted</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setParam("sort", v === "newest" ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-dim">
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-dimmer mb-4" />
          <div className="text-lg font-medium">
            {hasFilters ? "No projects match your filters" : "No projects yet"}
          </div>
          <div className="text-dim text-sm mt-1">
            {hasFilters ? "Try a different search or clear filters." : "Create your first project to start tracking work."}
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const c = counts[p.id] ?? { tickets: 0, members: 0 };
              const archived = p.is_archived;
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className={cn(
                    "group glass rounded-2xl p-5 hover:bg-white/[0.04] transition relative overflow-hidden",
                    archived && "opacity-60 grayscale hover:opacity-80 hover:grayscale-0",
                  )}
                >
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
                  <div className="flex items-start justify-between mb-6 gap-2">
                    <div className="font-mono text-xs px-2 py-1 rounded-md bg-white/5 hairline text-dim">
                      {p.acronym}
                    </div>
                    {archived ? (
                      <Badge className="bg-brand-gold/15 text-brand-gold ring-1 ring-brand-gold/30 hover:bg-brand-gold/20 gap-1">
                        <Archive className="h-3 w-3" /> Vaulted
                      </Badge>
                    ) : (
                      <ArrowRight className="h-4 w-4 text-dimmer group-hover:text-foreground transition" />
                    )}
                  </div>
                  <div className="text-lg font-semibold tracking-tight">{p.name}</div>
                  {p.client_name && (
                    <div className="text-xs text-dim mt-0.5">{p.client_name}</div>
                  )}
                  <div className="mt-4 flex gap-3 text-xs text-dim">
                    {archived ? (
                      <span>Archived {relativeTime(p.archived_at)}</span>
                    ) : (
                      <>
                        <span>{c.tickets} ticket{c.tickets === 1 ? "" : "s"}</span>
                        <span>·</span>
                        <span>{c.members} member{c.members === 1 ? "" : "s"}</span>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-dimmer">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </div>
            <ListPagination
              page={page}
              total={total}
              pageSize={pageSize}
              onChange={(p) => setParam("page", p === 1 ? null : String(p))}
            />
          </div>
        </>
      )}
    </div>
  );
}
