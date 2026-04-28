import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, LayoutGrid, List, Download, X, FileUp, Search, Clock, Plus, ChevronDown } from "lucide-react";
import { StartGroupTimerDialog } from "@/features/timelog/StartGroupTimerDialog";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import {
  TicketsFilter,
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { cn } from "@/lib/utils";
import type { TicketType } from "@/lib/types";

interface ParsedRow {
  title: string;
  type: TicketType;
  ticket_number: number | null;
  fe: number;
  be: number;
  epic: string;
  version: string;
  fe_status: "todo" | "in_progress" | "done";
  be_status: "todo" | "in_progress" | "done";
  error?: string;
}

function parseDiscipline(raw: string | undefined): "todo" | "in_progress" | "done" {
  const v = (raw ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (v === "done" || v === "complete" || v === "completed") return "done";
  if (
    v === "inprogress" ||
    v === "doing" ||
    v === "active" ||
    v === "wip"
  )
    return "in_progress";
  return "todo";
}

type ViewMode = "board" | "list";

export function ProjectTickets({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const pmba = isPMBA(role);
  const { tickets, reload } = useProjectTickets(projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [view, setView] = useState<ViewMode>("board");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [filterMine, setFilterMine] = useState<boolean>(true);
  const [touched, setTouched] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupTimerOpen, setGroupTimerOpen] = useState(false);
  const activeTimer = useTimerStore((s) => s.active);
  useEffect(() => {
    if (touched || role === null) return;
    setFilterMine(!pmba);
  }, [role, pmba, touched]);

  const visibleTickets = useMemo(() => {
    let out = tickets;
    if (filterMine && user) {
      out = out.filter((t) => t.assignees.some((a) => a.user_id === user.id));
    }
    out = applyFilters(out, filters);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.formatted_id ?? "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [tickets, filterMine, user, filters, search]);

  // Drop selections that are no longer visible (filter change, deletion, view switch)
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleSet = new Set(visibleTickets.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => visibleSet.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleTickets]);

  // Clear selection when leaving list view
  useEffect(() => {
    if (view !== "list") {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    }
  }, [view]);

  const toggleSelect = (id: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId && lastSelectedId !== id) {
        const ids = visibleTickets.map((t) => t.id);
        const a = ids.indexOf(lastSelectedId);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [from, to] = a < b ? [a, b] : [b, a];
          const shouldSelect = !prev.has(id);
          for (let i = from; i <= to; i++) {
            if (shouldSelect) next.add(ids[i]);
            else next.delete(ids[i]);
          }
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastSelectedId(id);
  };

  const toggleSelectAll = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const resetImport = () => {
    setRows([]);
    setFileName(null);
    setDragOver(false);
  };

  const downloadTemplate = () => {
    const csv =
      "Ticket #,Title,Type,FE Estimate,BE Estimate,Epic,Version,FE Status,BE Status\n" +
      ",Example: build login page,Standard,4,2,Authentication,v1,todo,todo\n" +
      "42,Example: fix header overflow,Bug,1,0,UI polish,v1,in_progress,todo\n" +
      ",Example: add export endpoint,CR,0,3,Reporting,v2,todo,done\n";
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
        const numberCol = findCol("Ticket #", "Ticket Number", "Number", "#", "ID", "Ticket ID");
        const titleCol = findCol("Title", "title", "Name");
        const typeCol = findCol("Type", "type");
        const feCol = findCol("FE Estimate", "FE", "Frontend", "fe estimate");
        const beCol = findCol("BE Estimate", "BE", "Backend", "be estimate");
        const epicCol = findCol("Epic", "epic", "Epic Name");
        const versionCol = findCol("Version", "version", "Phase");
        const feStatusCol = findCol("FE Status", "fe status", "Frontend Status");
        const beStatusCol = findCol("BE Status", "be status", "Backend Status");

        if (!titleCol) {
          toast.error("CSV must include a Title column");
          setFileName(null);
          return;
        }

        const existingNums = new Set(tickets.map((t) => t.ticket_number));
        const seenNums = new Map<number, number>(); // num -> first row index

        const parsed: ParsedRow[] = res.data.map((r, idx) => {
          const titleRaw = (r[titleCol] ?? "").trim();
          const typeRaw = (typeCol ? r[typeCol] : "Standard").trim();
          let type: TicketType = "Standard";
          const tl = typeRaw.toLowerCase();
          if (tl === "bug") type = "Bug";
          else if (tl === "cr" || tl === "change request") type = "CR";
          const fe = feCol ? parseFloat(r[feCol]) || 0 : 0;
          const be = beCol ? parseFloat(r[beCol]) || 0 : 0;
          const epic = epicCol ? (r[epicCol] ?? "").trim() : "";
          const version = versionCol ? (r[versionCol] ?? "").trim() : "";
          const fe_status = parseDiscipline(feStatusCol ? r[feStatusCol] : undefined);
          const be_status = parseDiscipline(beStatusCol ? r[beStatusCol] : undefined);

          // Parse ticket number (accept "42" or "ACR-042")
          let ticket_number: number | null = null;
          let numError: string | undefined;
          if (numberCol) {
            const raw = (r[numberCol] ?? "").trim();
            if (raw) {
              const m = raw.match(/(\d+)\s*$/);
              const n = m ? parseInt(m[1], 10) : NaN;
              if (!Number.isFinite(n) || n <= 0) {
                numError = `Invalid ticket #: "${raw}"`;
              } else if (existingNums.has(n)) {
                numError = `Ticket #${n} already exists`;
              } else if (seenNums.has(n)) {
                numError = `Duplicate ticket # in CSV`;
              } else {
                ticket_number = n;
                seenNums.set(n, idx);
              }
            }
          }

          return {
            title: titleRaw,
            type,
            ticket_number,
            fe,
            be,
            epic,
            version,
            fe_status,
            be_status,
            error: !titleRaw ? "Missing title" : numError,
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

    // Reserve user-specified numbers; for auto rows, pick next free numbers
    // that don't collide with existing or user-specified ones.
    const taken = new Set<number>(tickets.map((t) => t.ticket_number));
    valid.forEach((r) => {
      if (r.ticket_number != null) taken.add(r.ticket_number);
    });
    let cursor = 1;
    const nextFree = () => {
      while (taken.has(cursor)) cursor++;
      const n = cursor;
      taken.add(n);
      cursor++;
      return n;
    };

    const payload = valid.map((r) => ({
      project_id: projectId,
      title: r.title,
      ticket_type: r.type,
      original_fe_estimate: r.fe,
      original_be_estimate: r.be,
      current_fe_estimate: r.fe,
      current_be_estimate: r.be,
      fe_status: r.fe_status,
      be_status: r.be_status,
      epic_id: r.epic.trim() ? epicMap.get(r.epic.trim().toLowerCase()) ?? null : null,
      version: r.version.trim() || null,
      ticket_number: r.ticket_number ?? nextFree(),
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
      <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4 flex items-center gap-3 flex-wrap bg-background/85 backdrop-blur-md hairline-b">
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
          <>
            <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
              <button
                onClick={() => { setTouched(true); setFilterMine(false); }}
                className={cn("px-3 py-1 text-xs rounded-md transition", !filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
              >
                All
              </button>
              <button
                onClick={() => { setTouched(true); setFilterMine(true); }}
                className={cn("px-3 py-1 text-xs rounded-md transition", filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
              >
                My tickets
              </button>
            </div>
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
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="version">Version</SelectItem>
                  <SelectItem value="fe_status">FE status</SelectItem>
                  <SelectItem value="be_status">BE status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TicketsFilter
              projectId={projectId}
              tickets={tickets}
              filters={filters}
              onChange={setFilters}
            />
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID or title…"
              className="h-8 w-[220px] pl-8 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {filterMine && user && role && !activeTimer && (
            <Button
              size="sm"
              onClick={() => setGroupTimerOpen(true)}
              className="gap-2"
            >
              <Clock className="h-4 w-4" /> Start group timer
            </Button>
          )}
          {isPMBA(role) && (
            <div className="inline-flex rounded-md overflow-hidden">
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="gap-2 rounded-r-none"
              >
                <Plus className="h-4 w-4" /> Add ticket
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    aria-label="More add options"
                    className="rounded-l-none px-2 border-l border-primary-foreground/20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setImportOpen(true)} className="gap-2">
                    <Upload className="h-4 w-4" /> Import from CSV…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {view === "board" ? (
        <ProjectBoard
          projectId={projectId}
          search={search}
          filterMine={filterMine}
          onFilterMineChange={(v) => {
            setTouched(true);
            setFilterMine(v);
          }}
          tickets={tickets}
          reload={reload}
        />
      ) : visibleTickets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-dimmer mb-3" />
          <div className="font-medium">{filterMine ? "No tickets assigned to you" : "No tickets yet"}</div>
          <div className="text-dim text-sm mt-1">
            {filterMine ? "Switch to All to see every ticket on this project." : "Add tickets from the Board, or import a CSV."}
          </div>
        </div>
      ) : (
        <TicketsList
          tickets={visibleTickets}
          groupBy={groupBy}
          onOpen={setOpenTicket}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      {view === "list" && (
        <BulkActionsBar
          projectId={projectId}
          selectedIds={Array.from(selectedIds)}
          onClear={() => {
            setSelectedIds(new Set());
            setLastSelectedId(null);
          }}
          canEdit={pmba}
        />)}

      <StartGroupTimerDialog
        open={groupTimerOpen}
        onOpenChange={setGroupTimerOpen}
        tickets={tickets}
        role={role}
      />

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
              <span className="font-mono text-foreground">Ticket #, Title, Type, FE Estimate, BE Estimate, Epic, Version, FE Status, BE Status</span>
              <div className="mt-1 text-dimmer">Leave Ticket # blank to auto-assign the next available number.</div>
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
                      <th className="px-3 py-2 font-normal">#</th>
                      <th className="px-3 py-2 font-normal">Title</th>
                      <th className="px-3 py-2 font-normal">Type</th>
                      <th className="px-3 py-2 font-normal text-right">FE</th>
                      <th className="px-3 py-2 font-normal text-right">BE</th>
                      <th className="px-3 py-2 font-normal">Epic</th>
                      <th className="px-3 py-2 font-normal">Version</th>
                      <th className="px-3 py-2 font-normal">FE st.</th>
                      <th className="px-3 py-2 font-normal">BE st.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="hairline-b last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs text-dim">
                          {r.ticket_number ?? <span className="text-dimmer">auto</span>}
                        </td>
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
                        <td className="px-3 py-2 text-xs text-dim">
                          {r.epic || <span className="text-dimmer">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-dim font-mono">
                          {r.version || <span className="text-dimmer font-sans">—</span>}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-dim">{r.fe_status}</td>
                        <td className="px-3 py-2 text-[10px] text-dim">{r.be_status}</td>
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

      <AddTicketsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onCreated={reload}
      />

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
