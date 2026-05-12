import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/ListPagination";
import {
  useDebounced, useProjectsList, type SortKey, type StatusFilter,
} from "@/features/projects/useProjectsList";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { ProjectsToolbar } from "@/features/projects/ProjectsToolbar";

export default function Projects() {
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const status = (params.get("status") as StatusFilter) || "active";
  const sort = (params.get("sort") as SortKey) || "newest";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const debouncedQ = useDebounced(q, 200);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [creating, setCreating] = useState(false);

  const { projects, total, loading, counts, pageSize, reload } = useProjectsList({
    page, status, sort, debouncedQ,
  });

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (!value) next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.delete("page");
      setParams(next, { replace: true });
    },
    [params, setParams],
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
    setOpen(false); setName(""); setAcronym("");
    setParam("page", null);
    reload();
  };

  const hasFilters = !!debouncedQ || status !== "active" || sort !== "newest";
  const clearFilters = () => {
    setQ("");
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">Workspace</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-dim mt-1">1234Active client engagements and internal builds.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New project</Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
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

      <ProjectsToolbar
        q={q}
        status={status}
        sort={sort}
        hasFilters={hasFilters}
        onQChange={(v) => { setQ(v); setParam("q", v || null); }}
        onStatusChange={(v) => setParam("status", v === "active" ? null : v)}
        onSortChange={(v) => setParam("sort", v === "newest" ? null : v)}
        onClear={clearFilters}
      />

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
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                count={counts[p.id] ?? { tickets: 0, members: 0 }}
              />
            ))}
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
