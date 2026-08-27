import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedRow } from "./parsers";

const HEADERS: { label: string; className?: string; title?: string }[] = [
  { label: "#", className: "w-10" },
  { label: "Title" },
  { label: "Type", className: "w-20" },
  { label: "Parent", className: "w-14" },
  { label: "FE", className: "w-14 text-right" },
  { label: "BE", className: "w-14 text-right" },
  { label: "Proj", className: "w-14 text-right" },
  { label: "Epic", className: "w-32" },
  { label: "Version", className: "w-16" },
  { label: "FE st.", className: "w-16" },
  { label: "BE st.", className: "w-16" },
  { label: "Asgn", className: "w-12 text-right", title: "Assignees" },
];

const Dash = () => <span className="text-dimmer">—</span>;

function PreviewRow({ r }: { r: ParsedRow }) {
  const isProj = r.type === "Proj";
  const assigneeCount =
    r.fe_assignee_emails.length +
    r.be_assignee_emails.length +
    r.project_assignee_emails.length;

  return (
    <tr className={cn("hairline-b last:border-b-0 align-top", r.error && "bg-destructive/5")}>
      <td className="px-2 py-1.5 font-mono text-[11px] text-dim">
        {r.ticket_number ?? <span className="text-dimmer">auto</span>}
      </td>
      <td className="px-2 py-1.5">
        {r.error ? (
          <div className="space-y-0.5">
            <div className="text-xs truncate max-w-[260px]" title={r.title || "(missing)"}>
              {r.title || <span className="text-dimmer italic">(missing title)</span>}
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {r.error}
            </div>
          </div>
        ) : (
          <div className="text-xs truncate max-w-[280px]" title={r.title}>
            {r.title}
          </div>
        )}
      </td>
      <td className="px-2 py-1.5 text-[11px] text-dim">{r.type}</td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-dim">
        {r.parent_ticket_number ?? <Dash />}
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-[11px]">
        {isProj ? <Dash /> : `${r.fe}h`}
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-[11px]">
        {isProj ? <Dash /> : `${r.be}h`}
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-[11px]">
        {isProj ? `${r.proj}h` : <Dash />}
      </td>
      <td
        className="px-2 py-1.5 text-[11px] text-dim truncate max-w-[140px]"
        title={r.epic || ""}
      >
        {r.epic || <Dash />}
      </td>
      <td className="px-2 py-1.5 text-[11px] text-dim font-mono truncate">
        {r.version || <span className="text-dimmer font-sans">—</span>}
      </td>
      <td className="px-2 py-1.5 text-[10px] text-dim">{isProj ? <Dash /> : r.fe_status}</td>
      <td className="px-2 py-1.5 text-[10px] text-dim">
        {isProj ? r.project_status_name || <Dash /> : r.be_status}
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-[11px] text-dim">
        {assigneeCount || <Dash />}
      </td>
    </tr>
  );
}

export function CsvPreviewTable({ rows }: { rows: ParsedRow[] }) {
  return (
    <div className="max-h-[55vh] overflow-auto rounded-lg hairline">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="text-left text-[10px] text-dimmer uppercase tracking-wider sticky top-0 bg-surface-2 z-10">
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h.label}
                title={h.title}
                className={cn("px-2 py-2 font-normal", h.className)}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-3 py-6 text-center text-xs text-dimmer">
                No rows to show.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => <PreviewRow key={i} r={r} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
