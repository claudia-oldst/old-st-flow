import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import * as XLSX from "xlsx";
import { Loader2, Search } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { aggregateLogs, buildWorkbook } from "./teamTimeExport";
import { loadTeamLogs } from "./loadTeamLogs";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; members: TeamMember[] }

const dateCls = "h-9 w-full rounded-md bg-white/5 hairline px-2 text-xs font-mono text-foreground";

export function TeamTimeExportDialog({ open, onOpenChange, members }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setTo(format(new Date(), "yyyy-MM-dd"));
    setQ(""); setSelected(new Set());
  }, [open]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? members.filter((m) => m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s)) : members;
  }, [members, q]);
    const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const activeVisible = visible.filter((m) => m.is_active !== false);
  const allActive = activeVisible.length > 0 && activeVisible.every((m) => selected.has(m.id));
  const toggleAll = () => setSelected((p) => { const n = new Set(p); activeVisible.forEach((m) => (allActive ? n.delete(m.id) : n.add(m.id))); return n; });

  const run = async () => {
    if (!from || !to || from > to) return toast.error("Pick a valid start and end date");
    setBusy(true);
    try {
      const rows = aggregateLogs(await loadTeamLogs([...selected], from, to), from, to);
      if (rows.length === 0) toast.warning("No time logged in that period — exporting an empty sheet");
      XLSX.writeFile(buildWorkbook(rows), `team-time-${from}-to-${to}.xlsx`);
      onOpenChange(false);
    } catch (e) {
      toast.error("Export failed: " + (e instanceof Error ? e.message : "unknown error"));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Export team time</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-dim">Start date</Label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateCls} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-dim">End date</Label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateCls} /></div>
          </div>
          <p className="text-xs text-dimmer">Each day runs 00:00–23:59 in the person's own local time when they logged it.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-dim">Team members <span className="text-dimmer">({selected.size} selected)</span></Label>
              <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">{allActive ? "Deselect all" : "Select all active"}</button>
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-dimmer" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team members" className="h-8 pl-8 text-xs" />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md hairline divide-y divide-border">
              {visible.length === 0 ? <div className="p-4 text-xs text-dim">No team members found</div> : visible.map((m) => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-white/5">
                  <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <span className="flex-1 truncate">{m.name}</span>
                  {m.is_active === false && <span className="rounded-full px-2 py-0.5 text-[10px] ring-1 ring-border text-dimmer">Inactive</span>}
                  <span className="text-xs text-dimmer truncate">{m.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={run} disabled={busy || selected.size === 0} className="gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{busy ? "Exporting…" : "Download .xlsx"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
