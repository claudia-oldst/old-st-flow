import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatGBP } from "../types";
import { fmtHours, type BillingRow } from "./buildBilling";

type Col = { key: string; label: string; get: (r: BillingRow) => number; breakdown?: boolean };

const monthLabel = (m: string) => format(new Date(`${m}-01T12:00:00`), "MMM yy");

export function BillingTable({ rows, total, months, rate }: {
  rows: BillingRow[];
  total: BillingRow;
  months: string[];
  rate: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cols: Col[] = [
    ...(expanded
      ? [
          { key: "std", label: "Original (Std/Proj)", get: (r: BillingRow) => r.std, breakdown: true },
          { key: "cr", label: "Change Requests", get: (r: BillingRow) => r.cr, breakdown: true },
          { key: "bug", label: "Bugs", get: (r: BillingRow) => r.bug, breakdown: true },
        ]
      : []),
    { key: "original", label: "Total Original", get: (r) => r.original },
    { key: "revised", label: "Latest Revised Estimate", get: (r) => r.revised },
    ...months.map((m) => ({ key: m, label: monthLabel(m), get: (r: BillingRow) => r.months[m] ?? 0 })),
    { key: "actual", label: "Actual Total", get: (r) => r.actual },
  ];

  const cell = "px-3 py-2 text-right font-mono whitespace-nowrap";
  const sticky = "sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]";

  return (
    <div className="glass rounded-2xl overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="hairline-b text-[11px] uppercase tracking-wider text-dimmer">
            <th className={cn(sticky, "font-medium")}>Epic</th>
            {cols.map((c) => (
              <th key={c.key} className={cn("px-3 py-2 text-right font-medium whitespace-nowrap", c.breakdown && "bg-surface-2/40")}>
                {c.key === "original" ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Hide original breakdown" : "Show original breakdown"}
                  >
                    {expanded ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    {c.label}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hairline-b">
              <td className={sticky}>{r.name}</td>
              {cols.map((c) => (
                <td key={c.key} className={cn(cell, c.breakdown && "bg-surface-2/40 text-dim")}>{fmtHours(c.get(r))}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="hairline-b font-semibold">
            <td className={sticky}>Total (hours)</td>
            {cols.map((c) => <td key={c.key} className={cell}>{fmtHours(c.get(total))}</td>)}
          </tr>
          {rate > 0 && (
            <tr className="font-semibold text-primary">
              <td className={sticky}>Total (GBP)</td>
              {cols.map((c) => <td key={c.key} className={cell}>{formatGBP(c.get(total) * rate)}</td>)}
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}
