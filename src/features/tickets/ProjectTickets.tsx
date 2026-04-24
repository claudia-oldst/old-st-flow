import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, LayoutGrid, List, Download, X, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { TicketsList, type GroupBy } from "@/features/tickets/TicketsList";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { cn } from "@/lib/utils";
import type { TicketType } from "@/lib/types";

interface ParsedRow {
  title: string;
  type: TicketType;
  fe: number;
  be: number;
  error?: string;
}

type ViewMode = "board" | "list";

export function ProjectTickets({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const { tickets, reload } = useProjectTickets(projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [view, setView] = useState<ViewMode>("board");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

  const resetImport = () => {
    setRows([]);
    setFileName(null);
    setDragOver(false);
  };

  const downloadTemplate = () => {
    const csv =
      "Title,Type,FE Estimate,BE Estimate\n" +
      "Example: build login page,Standard,4,2\n" +
      "Example: fix header overflow,Bug,1,0\n" +
      "Example: add export endpoint,CR,0,3\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tickets-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields ?? [];
        const findCol = (...keys: string[]) =>
          cols.find((c) => keys.some((k) => c.trim().toLowerCase() === k.toLowerCase())) ?? null;
        const titleCol = findCol("Title", "title", "Name");
        const typeCol = findCol("Type", "type");
        const feCol = findCol("FE Estimate", "FE", "Frontend", "fe estimate");
        const beCol = findCol("BE Estimate", "BE", "Backend", "be estimate");

        if (!titleCol) {
          toast.error("CSV must include a Title column");
          return;
        }

        const parsed: ParsedRow[] = res.data.map((r) => {
          const titleRaw = (r[titleCol] ?? "").trim();
          const typeRaw = (typeCol ? r[typeCol] : "Standard").trim();
          let type: TicketType = "Standard";
          const tl = typeRaw.toLowerCase();
          if (tl === "bug") type = "Bug";
          else if (tl === "cr" || tl === "change request") type = "CR";
          const fe = feCol ? parseFloat(r[feCol]) || 0 : 0;
          const be = beCol ? parseFloat(r[beCol]) || 0 : 0;
          return {
            title: titleRaw,
            type,
            fe,
            be,
            error: !titleRaw ? "Missing title" : undefined,
          };
        });
        setRows(parsed);
        setImportOpen(true);
      },
      error: (err) => toast.error("Failed to parse CSV: " + err.message),
    });
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return toast.error("No valid rows to import");
    setImporting(true);
    const payload = valid.map((r) => ({
      project_id: projectId,
      title: r.title,
      ticket_type: r.type,
      est_frontend_hours: r.fe,
      est_backend_hours: r.be,
      ticket_number: 0,
      formatted_id: "",
    }));
    const { error } = await supabase.from("tickets").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${valid.length} ticket${valid.length === 1 ? "" : "s"}`);
    setImportOpen(false);
    setRows([]);
    reload();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
          <button
            onClick={() => setView("board")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition inline-flex items-center gap-1.5",
              view === "board" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3 w-3" /> Board
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition inline-flex items-center gap-1.5",
              view === "list" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            <List className="h-3 w-3" /> List
          </button>
        </div>

        {view === "list" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-dim">Group by</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="assignee">Assignee</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isPMBA(role) && (
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
          )}
        </div>
      </div>

      {view === "board" ? (
        <ProjectBoard projectId={projectId} />
      ) : tickets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-dimmer mb-3" />
          <div className="font-medium">No tickets yet</div>
          <div className="text-dim text-sm mt-1">Add tickets from the Board, or import a CSV.</div>
        </div>
      ) : (
        <TicketsList tickets={tickets} groupBy={groupBy} onOpen={setOpenTicket} />
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSV preview</DialogTitle>
            <div className="text-xs text-dim mt-1">
              Expected columns: <span className="font-mono text-foreground">Title, Type, FE Estimate, BE Estimate</span>
            </div>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg hairline">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dimmer uppercase tracking-wider sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-3 py-2 font-normal">Title</th>
                  <th className="px-3 py-2 font-normal">Type</th>
                  <th className="px-3 py-2 font-normal text-right">FE</th>
                  <th className="px-3 py-2 font-normal text-right">BE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="hairline-b last:border-b-0">
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" /> {r.error}
                        </span>
                      ) : (
                        r.title
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-dim">{r.type}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.fe}h</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.be}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing}>
              Import {rows.filter((r) => !r.error).length} ticket{rows.filter((r) => !r.error).length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketDetailSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        ticket={openTicket}
        projectId={projectId}
        onChange={reload}
      />
    </div>
  );
}
