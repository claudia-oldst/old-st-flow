import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FileUp,
  Filter,
  Info,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadTicketsTemplate, type ParsedRow } from "./useTicketsCsvImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ParsedRow[];
  fileName: string | null;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  importing: boolean;
  handleFile: (f: File) => void;
  reset: () => void;
  onImport: () => void;
}

const ALL_COLUMNS =
  "Ticket #, Title, Type, FE Estimate, BE Estimate, Project Estimate, Epic, Version, FE Status, BE Status, Project Status, Parent Ticket #, FE Assignees, BE Assignees, Project Assignees, Acceptance Criteria";

export function ImportCsvDialog({
  open,
  onOpenChange,
  rows,
  fileName,
  dragOver,
  setDragOver,
  importing,
  handleFile,
  reset,
  onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const validCount = useMemo(() => rows.filter((r) => !r.error).length, [rows]);
  const errorCount = rows.length - validCount;
  const visibleRows = useMemo(
    () => (showErrorsOnly ? rows.filter((r) => r.error) : rows),
    [rows, showErrorsOnly],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          reset();
          setShowErrorsOnly(false);
          setHelpOpen(false);
        }
      }}
    >
      <DialogContent className="glass-strong max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import tickets from CSV</DialogTitle>
          <p className="text-xs text-dim mt-1">
            Upload a CSV to bulk-create tickets. Only{" "}
            <span className="font-mono text-foreground">Title</span> is required.
          </p>
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
              onClick={downloadTicketsTemplate}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hairline bg-white/[0.02] hover:bg-white/[0.05] transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-dim" />
                </div>
                <div>
                  <div className="text-sm font-medium">Download CSV template</div>
                  <div className="text-xs text-dim">Pre-formatted with example rows</div>
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
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
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

            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="w-full flex items-center gap-2 text-xs text-dim hover:text-foreground transition px-1"
            >
              {helpOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Info className="h-3 w-3" />
              Format reference
            </button>
            {helpOpen && (
              <div className="rounded-lg hairline bg-white/[0.02] p-3 space-y-2 text-xs">
                <div>
                  <div className="text-dimmer uppercase tracking-wider text-[10px] mb-1">
                    Columns
                  </div>
                  <div className="font-mono text-foreground leading-relaxed">
                    {ALL_COLUMNS}
                  </div>
                </div>
                <ul className="text-dim space-y-1 list-disc pl-4">
                  <li>
                    <span className="font-mono text-foreground">Type</span> = Standard /
                    Bug / CR / Proj
                  </li>
                  <li>
                    Assignee columns accept comma-separated emails of project members
                  </li>
                  <li>
                    <span className="font-mono text-foreground">Project Status</span>{" "}
                    applies to Proj rows only (use a status name from the project, e.g.
                    "In Progress")
                  </li>
                  <li>
                    <span className="font-mono text-foreground">Parent Ticket #</span>{" "}
                    links any Standard / CR / Bug row to a Standard or CR parent
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hairline bg-white/[0.02]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-dim shrink-0" />
                <span className="text-sm truncate">{fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-dim">
                  {rows.length} row{rows.length === 1 ? "" : "s"}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  {validCount} valid
                </span>
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowErrorsOnly((v) => !v)}
                    className={cn(
                      "text-[11px] font-mono px-2 py-0.5 rounded inline-flex items-center gap-1 transition",
                      showErrorsOnly
                        ? "bg-destructive/20 text-destructive ring-1 ring-destructive/40"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/15",
                    )}
                    title={
                      showErrorsOnly ? "Show all rows" : "Show only rows with errors"
                    }
                  >
                    <Filter className="h-3 w-3" />
                    {errorCount} error{errorCount === 1 ? "" : "s"}
                  </button>
                )}
                <button
                  onClick={reset}
                  className="text-dimmer hover:text-foreground transition p-1"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-auto rounded-lg hairline">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="text-left text-[10px] text-dimmer uppercase tracking-wider sticky top-0 bg-surface-2 z-10">
                  <tr>
                    <th className="px-2 py-2 font-normal w-10">#</th>
                    <th className="px-2 py-2 font-normal">Title</th>
                    <th className="px-2 py-2 font-normal w-20">Type</th>
                    <th className="px-2 py-2 font-normal w-14">Parent</th>
                    <th className="px-2 py-2 font-normal w-14 text-right">FE</th>
                    <th className="px-2 py-2 font-normal w-14 text-right">BE</th>
                    <th className="px-2 py-2 font-normal w-14 text-right">Proj</th>
                    <th className="px-2 py-2 font-normal w-32">Epic</th>
                    <th className="px-2 py-2 font-normal w-16">Version</th>
                    <th className="px-2 py-2 font-normal w-16">FE st.</th>
                    <th className="px-2 py-2 font-normal w-16">BE st.</th>
                    <th className="px-2 py-2 font-normal w-12 text-right" title="Assignees">
                      Asgn
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-3 py-6 text-center text-xs text-dimmer"
                      >
                        No rows to show.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r, i) => {
                      const isProj = r.type === "Proj";
                      const assigneeCount =
                        r.fe_assignee_emails.length +
                        r.be_assignee_emails.length +
                        r.project_assignee_emails.length;
                      return (
                        <tr
                          key={i}
                          className={cn(
                            "hairline-b last:border-b-0 align-top",
                            r.error && "bg-destructive/5",
                          )}
                        >
                          <td className="px-2 py-1.5 font-mono text-[11px] text-dim">
                            {r.ticket_number ?? (
                              <span className="text-dimmer">auto</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {r.error ? (
                              <div className="space-y-0.5">
                                <div
                                  className="text-xs truncate max-w-[260px]"
                                  title={r.title || "(missing)"}
                                >
                                  {r.title || (
                                    <span className="text-dimmer italic">
                                      (missing title)
                                    </span>
                                  )}
                                </div>
                                <div className="inline-flex items-center gap-1 text-[10px] text-destructive">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {r.error}
                                </div>
                              </div>
                            ) : (
                              <div
                                className="text-xs truncate max-w-[280px]"
                                title={r.title}
                              >
                                {r.title}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-[11px] text-dim">{r.type}</td>
                          <td className="px-2 py-1.5 font-mono text-[11px] text-dim">
                            {r.parent_ticket_number ?? (
                              <span className="text-dimmer">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">
                            {isProj ? <span className="text-dimmer">—</span> : `${r.fe}h`}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">
                            {isProj ? <span className="text-dimmer">—</span> : `${r.be}h`}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">
                            {isProj ? `${r.proj}h` : <span className="text-dimmer">—</span>}
                          </td>
                          <td
                            className="px-2 py-1.5 text-[11px] text-dim truncate max-w-[140px]"
                            title={r.epic || ""}
                          >
                            {r.epic || <span className="text-dimmer">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-[11px] text-dim font-mono truncate">
                            {r.version || (
                              <span className="text-dimmer font-sans">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-dim">
                            {isProj ? (
                              <span className="text-dimmer">—</span>
                            ) : (
                              r.fe_status
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-dim">
                            {isProj ? (
                              r.project_status_name || (
                                <span className="text-dimmer">—</span>
                              )
                            ) : (
                              r.be_status
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px] text-dim">
                            {assigneeCount || <span className="text-dimmer">—</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {errorCount > 0 && (
              <p className="text-[11px] text-dimmer px-1">
                Rows with errors will be skipped. Fix them in your CSV and re-upload, or
                proceed to import the {validCount} valid row{validCount === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {rows.length > 0 && (
            <Button onClick={onImport} disabled={importing || validCount === 0}>
              {importing
                ? "Importing…"
                : `Import ${validCount} ticket${validCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
