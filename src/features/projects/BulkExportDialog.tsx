import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LIFECYCLE_PILL } from "@/features/project/settings/lifecycle";
import { buildProjectWorkbook } from "@/features/project/export/runExportProject";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const today = () => format(new Date(), "yyyy-MM-dd");

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function BulkExportDialog({ open, onOpenChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(today());
  const [includeTickets, setIncludeTickets] = useState(true);
  const [includeChanges, setIncludeChanges] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setFromDate("");
    setToDate(today());
    setSelected(new Set());
    setQ("");
    setLoading(true);
    supabase
      .from("projects")
      .select("*")
      .eq("is_archived", false)
      .order("name")
      .then(({ data, error }) => {
        setLoading(false);
        if (error) toast.error(error.message);
        setProjects((data ?? []) as Project[]);
      });
  }, [open]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(s) || p.acronym.toLowerCase().includes(s));
  }, [projects, q]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) visible.forEach((p) => n.delete(p.id));
      else visible.forEach((p) => n.add(p.id));
      return n;
    });

  const busy = progress !== null;
  const noTabs = !includeTickets && !includeChanges && !includeLogs;

  const generate = async () => {
    const chosen = projects.filter((p) => selected.has(p.id));
    if (chosen.length === 0) return toast.error("Select at least one project");
    if (noTabs) return toast.error("Select at least one tab");
    const asOf = toDate ? new Date(toDate) : new Date();
    setProgress({ done: 0, total: chosen.length });
    try {
      const zip = new JSZip();
      const failed: string[] = [];
      for (let i = 0; i < chosen.length; i++) {
        const p = chosen[i];
        const fromStr = fromDate || p.start_date || "";
        const res = await buildProjectWorkbook({
          project: p, asOf, from: fromStr ? new Date(fromStr) : null,
          includeTickets, includeChanges, includeLogs,
        });
        if (res.ok) {
          const buf = XLSX.write(res.wb, { type: "array", bookType: "xlsx" });
          zip.file(res.filename, buf);
        } else {
          failed.push(p.acronym);
        }
        setProgress({ done: i + 1, total: chosen.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `pulse-projects-export-${format(asOf, "yyyy-MM-dd")}.zip`);
      if (failed.length) toast.warning(`Skipped: ${failed.join(", ")}`);
      else toast.success("Export ready");
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Export failed: " + (err instanceof Error ? err.message : "unknown error"));
    } finally {
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export projects</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-dim">
                Projects <span className="text-dimmer">({selected.size} selected)</span>
              </Label>
              <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-dimmer" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="h-8 pl-8 text-xs" />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md hairline divide-y divide-border">
              {loading ? (
                <div className="p-4 text-xs text-dim flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading projects…
                </div>
              ) : visible.length === 0 ? (
                <div className="p-4 text-xs text-dim">No projects found</div>
              ) : (
                visible.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-white/5">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                    <span className="font-mono text-xs text-dim w-12 shrink-0">{p.acronym}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.lifecycle_status && (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 shrink-0", LIFECYCLE_PILL[p.lifecycle_status])}>
                        {p.lifecycle_status}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-dim">From</Label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-full rounded-md bg-white/5 hairline px-2 text-xs font-mono text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-dim">To</Label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-full rounded-md bg-white/5 hairline px-2 text-xs font-mono text-foreground"
              />
            </div>
          </div>
          <p className="text-xs text-dimmer">
            Leave From empty to use each project's own start date. The same range applies to every selected project.
          </p>

          <div className="space-y-2 pt-1">
            <Label className="text-xs text-dim">Include tabs</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeTickets} onCheckedChange={(v) => setIncludeTickets(!!v)} />
                Tickets
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeChanges} onCheckedChange={(v) => setIncludeChanges(!!v)} />
                Change Requests
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeLogs} onCheckedChange={(v) => setIncludeLogs(!!v)} />
                Time Logs
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={generate} disabled={busy || selected.size === 0 || noTabs} className="gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? `Exporting ${progress!.done} of ${progress!.total}…` : "Download .zip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
