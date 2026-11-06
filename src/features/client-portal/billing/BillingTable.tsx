import { Fragment, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatGBP } from "../types";
import { fmtHours, grandMonth, type BillingRow } from "./buildBilling";

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
    { key: "discount", label: "Discount/Unbilled", get: (r) => r.discount },
    { key: "grand", label: "Grand Total", get: (r) => r.grand },
  ];

  /** Value for the Discount/Unbilled and Grand Total rows; null = blank cell (estimates don't take discounts). */
  const isMonth = (k: string) => months.includes(k);
  const discountCell = (k: string): number | null =>
    isMonth(k) ? total.discountMonths[k] ?? 0 : k === "discount" ? total.discount : null;
  const grandCell = (k: string): number | null =>
    isMonth(k) ? grandMonth(total, k) : k === "grand" ? total.grand : null;
  const extraRows: { label: string; get: (k: string) => number | null }[] = [
    { label: "Discount/Unbilled", get: discountCell },
    { label: "Grand Total", get: grandCell },
  ];

  const cell = "px-3 py-2 text-right font-mono whitespace-nowrap";
  const sticky = "sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]";

  // Totals render above and below the epic rows so they're readable without scrolling.
  const totals = (
    <>
      <tr className="hairline-b font-semibold text-sm normal-case tracking-normal text-foreground">
        <td className={sticky}>Total (hours)</td>
        {cols.map((c) => <td key={c.key} className={cell}>{fmtHours(c.get(total))}</td>)}
      </tr>
      {rate > 0 && (
        <tr className="hairline-b font-semibold text-sm normal-case tracking-normal text-primary">
          <td className={sticky}>Total (GBP)</td>
          {cols.map((c) => <td key={c.key} className={cell}>{formatGBP(c.get(total) * rate)}</td>)}
        </tr>
      )}
      {extraRows.map((x) => (
        <Fragment key={x.label}>
          <tr className="hairline-b font-semibold text-sm normal-case tracking-normal text-foreground">
            <td className={sticky}>{x.label} (hours)</td>
            {cols.map((c) => {
              const v = x.get(c.key);
              return <td key={c.key} className={cell}>{v === null ? "" : fmtHours(v)}</td>;
            })}
          </tr>
          {rate > 0 && (
            <tr className="hairline-b font-semibold text-sm normal-case tracking-normal text-primary">
              <td className={sticky}>{x.label} (GBP)</td>
              {cols.map((c) => {
                const v = x.get(c.key);
                return <td key={c.key} className={cell}>{v === null ? "" : formatGBP(v * rate)}</td>;
              })}
            </tr>
          )}
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="glass rounded-2xl overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="hairline-b text-[11px] uppercase tracking-wider text-dimmer">
            <th className={cn(sticky, "font-medium")}>Epic <span className="normal-case text-dimmer/70">(hours)</span></th>
            {cols.map((c) => (
              <th key={c.key} className={cn("px-3 py-2 text-right align-bottom font-medium leading-tight max-w-[110px]", c.breakdown && "bg-surface-2/40")}>
                {c.key === "original" ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="inline-flex items-end gap-1 text-right uppercase hover:text-foreground"
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
          {totals}
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id ?? "no-epic"} className="group hairline-b hover:bg-surface-2/60">
              <td className={cn(sticky, "group-hover:bg-surface-2")}>{r.name}</td>
              {cols.map((c) => (
                <td key={c.key} className={cn(cell, c.breakdown && "bg-surface-2/40 text-dim")}>{fmtHours(c.get(r))}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>{totals}</tfoot>
      </table>
    </div>
  );
}
