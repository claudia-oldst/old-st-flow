import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Plus, ArrowRight, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [creating, setCreating] = useState(false);
  const [counts, setCounts] = useState<Record<string, { tickets: number; members: number }>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data ?? []);
    setLoading(false);

    if (data && data.length) {
      const ids = data.map((p) => p.id);
      const [{ data: tix }, { data: mems }] = await Promise.all([
        supabase.from("tickets").select("project_id").in("project_id", ids),
        supabase.from("project_members").select("project_id").in("project_id", ids),
      ]);
      const c: Record<string, { tickets: number; members: number }> = {};
      data.forEach((p) => (c[p.id] = { tickets: 0, members: 0 }));
      tix?.forEach((t) => (c[t.project_id].tickets++));
      mems?.forEach((m) => (c[m.project_id].members++));
      setCounts(c);
    }
  }, []);

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
    load();
  };

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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-dimmer mb-4" />
          <div className="text-lg font-medium">No projects yet</div>
          <div className="text-dim text-sm mt-1">Create your first project to start tracking work.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const c = counts[p.id] ?? { tickets: 0, members: 0 };
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="group glass rounded-2xl p-5 hover:bg-white/[0.04] transition relative overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
                <div className="flex items-start justify-between mb-6">
                  <div className="font-mono text-xs px-2 py-1 rounded-md bg-white/5 hairline text-dim">
                    {p.acronym}
                  </div>
                  <ArrowRight className="h-4 w-4 text-dimmer group-hover:text-foreground transition" />
                </div>
                <div className="text-lg font-semibold tracking-tight">{p.name}</div>
                <div className="mt-4 flex gap-4 text-xs text-dim">
                  <span>{c.tickets} ticket{c.tickets === 1 ? "" : "s"}</span>
                  <span>·</span>
                  <span>{c.members} member{c.members === 1 ? "" : "s"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
