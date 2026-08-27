import { useMemo, useState } from "react";
import { FileText, Filter, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CsvDropzone } from "./csv/CsvDropzone";
import { CsvPreviewTable } from "./csv/CsvPreviewTable";
import type { ParsedRow } from "./useTicketsCsvImport";

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

        {rows.length === 0 ? (
          <CsvDropzone
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleFile={handleFile}
          />
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
                    title={showErrorsOnly ? "Show all rows" : "Show only rows with errors"}
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

            <CsvPreviewTable rows={visibleRows} />

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
