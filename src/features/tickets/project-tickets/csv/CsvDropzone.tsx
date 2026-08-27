import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileText, FileUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadTicketsTemplate } from "./parsers";

const ALL_COLUMNS =
  "Ticket #, Title, Type, FE Estimate, BE Estimate, Project Estimate, Epic, Version, FE Status, BE Status, Project Status, Parent Ticket #, FE Assignees, BE Assignees, Project Assignees, Acceptance Criteria";

/** Upload step of the CSV import dialog: template download, drop zone, format help. */
export function CsvDropzone({
  dragOver,
  setDragOver,
  handleFile,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFile: (f: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-3 py-2">
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
            <div className="text-dimmer uppercase tracking-wider text-[10px] mb-1">Columns</div>
            <div className="font-mono text-foreground leading-relaxed">{ALL_COLUMNS}</div>
          </div>
          <ul className="text-dim space-y-1 list-disc pl-4">
            <li>
              <span className="font-mono text-foreground">Type</span> = Standard / Bug / CR /
              Proj
            </li>
            <li>Assignee columns accept comma-separated emails of project members</li>
            <li>
              <span className="font-mono text-foreground">Project Status</span> applies to Proj
              rows only (use a status name from the project, e.g. "In Progress")
            </li>
            <li>
              <span className="font-mono text-foreground">Parent Ticket #</span> links any
              Standard / CR / Bug row to a Standard or CR parent
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
