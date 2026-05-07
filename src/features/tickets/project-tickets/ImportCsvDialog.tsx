import { useRef } from "react";
import { AlertCircle, Download, FileText, FileUp, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  downloadTicketsTemplate,
  type ParsedRow,
} from "./useTicketsCsvImport";

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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
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
              onClick={downloadTicketsTemplate}
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
                onClick={reset}
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {rows.length > 0 && (
            <Button onClick={onImport} disabled={importing}>
              Import {rows.filter((r) => !r.error).length} ticket
              {rows.filter((r) => !r.error).length === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
