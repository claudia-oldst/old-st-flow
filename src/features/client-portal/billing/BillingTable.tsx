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

  const groupOf = (k: string): "est" | "month" | "total" =>
    isMonth(k) ? "month" : ["actual", "discount", "grand"].includes(k) ? "total" : "est";
  // First column of each block gets a divider so the three groups read separately.
  const firstOfGroup = new Set<string>();
  cols.forEach((c, i) => { if (i === 0 || groupOf(cols[i - 1].key) !== groupOf(c.key)) firstOfGroup.add(c.key); });
  const colCls = (k: string) =>
    cn(
      firstOfGroup.has(k) && "border-l border-border",
      groupOf(k) === "total" && "bg-surface-2/50",
      k === "grand" && "font-semibold text-foreground",
    );

  const cell = "px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums";
  const sticky = "sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px] border-r border-border";
  const num = (v: number, fmt: (n: number) => string) =>
    Math.abs(v) < 0.005 ? <span className="text-dimmer">–</span> : fmt(v);
  const gbp = (n: number) => formatGBP(n * rate);

  const totalRow = (label: string, get: (k: string) => number | null, opts: { gbp?: boolean; first?: boolean; strong?: boolean; dim?: boolean }) => (
    <tr
      key={label + (opts.gbp ? "-gbp" : "")}
      className={cn(
        "bg-surface-2/70 text-sm normal-case tracking-normal border-b border-border/50",
        opts.first && "border-t-2 border-t-border",
        opts.strong ? "font-semibold" : "font-medium",
        opts.gbp ? "text-primary" : opts.dim ? "text-dim" : "text-foreground",
      )}
    >
      <td className={cn(sticky, "bg-surface-2")}>{label} ({opts.gbp ? "GBP" : "hours"})</td>
      {cols.map((c) => {
        const v = get(c.key);
        return (
          <td key={c.key} className={cn(cell, colCls(c.key), opts.gbp && "text-primary", opts.dim && !opts.gbp && "text-dim")}>
            {v === null ? "" : num(v, opts.gbp ? gbp : fmtHours)}
          </td>
        );
      })}
    </tr>
  );

  const totals = (top: boolean) => {
    const totalGet = (k: string) => { const c = cols.find((x) => x.key === k)!; return c.get(total); };
    const defs = [
      { label: "Total", get: totalGet, strong: true, dim: false },
      ...extraRows.map((x) => ({ label: x.label, get: x.get, strong: x.label === "Grand Total", dim: x.label !== "Grand Total" })),
    ];
    return (
      <>
        {defs.map((d, i) => (
          <Fragment key={d.label}>
            {totalRow(d.label, d.get, { first: i === 0 && !top, strong: d.strong, dim: d.dim })}
            {rate > 0 && totalRow(d.label, d.get, { gbp: true, strong: d.strong })}
          </Fragment>
        ))}
      </>
    );
  };

  return (
    <div className="glass rounded-2xl overflow-auto max-h-[75vh] border border-border">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-surface-2 border-b-2 border-border text-[11px] uppercase tracking-wider text-foreground/80">
            <th className={cn(sticky, "z-30 bg-surface-2 font-semibold")}>Epic <span className="normal-case text-dimmer">(hours)</span></th>
            {cols.map((c) => (
              <th key={c.key} className={cn("px-3 py-2.5 text-right align-bottom font-semibold leading-tight max-w-[110px] bg-surface-2", colCls(c.key), c.key === "grand" && "text-foreground")}>
                {c.key === "original" ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="inline-flex items-end gap-1 text-right uppercase hover:text-primary"
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
          {totals(true)}
          {rows.map((r, i) => (
            <tr key={r.id ?? "no-epic"} className={cn("group border-b border-border/40 hover:bg-primary/10", i % 2 === 1 && "bg-surface-2/25")}>
              <td className={cn(sticky, "font-medium text-foreground group-hover:bg-surface-2", i === 0 && "border-t-2 border-t-border")}>{r.name}</td>
              {cols.map((c) => (
                <td key={c.key} className={cn(cell, colCls(c.key), c.breakdown && "text-dim", i === 0 && "border-t-2 border-t-border")}>{num(c.get(r), fmtHours)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>{totals(false)}</tfoot>
      </table>
    </div>
  );
}
