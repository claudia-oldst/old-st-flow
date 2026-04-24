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
  epic: string;
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
      "Title,Type,FE Estimate,BE Estimate,Epic\n" +
      "Example: build login page,Standard,4,2,Authentication\n" +
      "Example: fix header overflow,Bug,1,0,UI polish\n" +
      "Example: add export endpoint,CR,0,3,Reporting\n";
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
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
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
        const epicCol = findCol("Epic", "epic", "Epic Name");

        if (!titleCol) {
          toast.error("CSV must include a Title column");
          setFileName(null);
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
          const epic = epicCol ? (r[epicCol] ?? "").trim() : "";
          return {
            title: titleRaw,
            type,
            fe,
            be,
            epic,
            error: !titleRaw ? "Missing title" : undefined,
          };
        });
        setRows(parsed);
      },
      error: (err) => {
        toast.error("Failed to parse CSV: " + err.message);
        setFileName(null);
      },
    });
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return toast.error("No valid rows to import");
    setImporting(true);

    // Resolve / create epics referenced in the CSV
    const epicNames = Array.from(
      new Set(valid.map((r) => r.epic.trim()).filter(Boolean))
    );
    const epicMap = new Map<string, number>(); // key = lowercase name

    if (epicNames.length > 0) {
      const { data: existing } = await supabase
        .from("project_epics")
        .select("id, epic_name")
        .eq("project_id", projectId);
      (existing ?? []).forEach((e: any) => {
        if (e.epic_name) epicMap.set(e.epic_name.trim().toLowerCase(), e.id);
      });

      const toCreate = epicNames.filter(
        (n) => !epicMap.has(n.toLowerCase())
      );
      if (toCreate.length > 0) {
        const { data: created, error: epicErr } = await supabase
          .from("project_epics")
          .insert(toCreate.map((name) => ({ project_id: projectId, epic_name: name })))
          .select("id, epic_name");
        if (epicErr) {
          setImporting(false);
          return toast.error("Failed to create epics: " + epicErr.message);
        }
        (created ?? []).forEach((e: any) => {
          if (e.epic_name) epicMap.set(e.epic_name.trim().toLowerCase(), e.id);
        });
      }
    }

    const payload = valid.map((r) => ({
      project_id: projectId,
      title: r.title,
      ticket_type: r.type,
      est_frontend_hours: r.fe,
      est_backend_hours: r.be,
      epic_id: r.epic.trim() ? epicMap.get(r.epic.trim().toLowerCase()) ?? null : null,
      ticket_number: 0,
      formatted_id: "",
    }));
    const { error } = await supabase.from("tickets").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${valid.length} ticket${valid.length === 1 ? "" : "s"}`);
    setImportOpen(false);
    resetImport();
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

      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          setImportOpen(o);
          if (!o) resetImport();
        }}
      >
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import tickets from CSV</DialogTitle>
            <div className="text-xs text-dim mt-1">
              Expected columns:{" "}
              <span className="font-mono text-foreground">Title, Type, FE Estimate, BE Estimate</span>
            </div>
          </DialogHeader>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {rows.length === 0 ? (
            <div className="space-y-3 py-2">
              <button
                type="button"
                onClick={downloadTemplate}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hairline bg-white/[0.02] hover:bg-white/[0.05] transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-dim" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Download CSV template</div>
                    <div className="text-xs text-dim">Pre-formatted with the required columns</div>
                  </div>
                </div>
                <Download className="h-4 w-4 text-dim" />
              </button>

              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={cn(
                  "cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition",
                  dragOver
                    ? "border-accent bg-accent/5"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                )}
              >
                <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <FileUp className="h-5 w-5 text-dim" />
                </div>
                <div className="text-sm font-medium">
                  {dragOver ? "Drop your CSV here" : "Drag & drop your CSV"}
                </div>
                <div className="text-xs text-dim mt-1">
                  or <span className="text-foreground underline">browse files</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg hairline bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-dim shrink-0" />
                  <span className="text-sm truncate">{fileName}</span>
                  <span className="text-xs text-dimmer font-mono">
                    {rows.length} row{rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  onClick={resetImport}
                  className="text-dimmer hover:text-foreground transition"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto rounded-lg hairline">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            {rows.length > 0 && (
              <Button onClick={handleImport} disabled={importing}>
                Import {rows.filter((r) => !r.error).length} ticket
                {rows.filter((r) => !r.error).length === 1 ? "" : "s"}
              </Button>
            )}
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
