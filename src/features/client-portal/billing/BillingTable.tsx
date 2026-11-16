import { Fragment, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatGBP } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtHours, grandMonth, type BillingRow, type Split } from "./buildBilling";

type Col = { key: string; label: string; get: (r: BillingRow) => number; breakdown?: boolean; split?: (r: BillingRow) => Split };

const monthLabel = (m: string) => format(new Date(`${m}-01T12:00:00`), "MMM yy");

export function BillingTable({ rows, total, months, rate }: {
  rows: BillingRow[];
  total: BillingRow;
  months: string[];
  rate: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [revExpanded, setRevExpanded] = useState(false);
  const cols: Col[] = [
    ...(expanded
      ? [
          { key: "std", label: "Original (Std/Proj)", get: (r: BillingRow) => r.std, breakdown: true },
          { key: "cr", label: "Change Requests", get: (r: BillingRow) => r.cr, breakdown: true },
          { key: "bug", label: "Bugs", get: (r: BillingRow) => r.bug, breakdown: true },
        ]
      : []),
    { key: "original", label: "Total Original", get: (r) => r.original, split: (r) => ({ std: r.std, cr: r.cr, bug: r.bug }) },
    ...(revExpanded
      ? [
          { key: "rstd", label: "Revised (Std/Proj)", get: (r: BillingRow) => r.rStd, breakdown: true },
          { key: "rcr", label: "Change Requests", get: (r: BillingRow) => r.rCr, breakdown: true },
          { key: "rbug", label: "Bugs", get: (r: BillingRow) => r.rBug, breakdown: true },
        ]
      : []),
    { key: "revised", label: "Latest Revised Estimate", get: (r) => r.revised, split: (r) => ({ std: r.rStd, cr: r.rCr, bug: r.rBug }) },
    ...months.map((m) => ({ key: m, label: monthLabel(m), get: (r: BillingRow) => r.months[m] ?? 0, split: (r: BillingRow) => r.splitMonths[m] ?? { std: 0, cr: 0, bug: 0 } })),
    { key: "actual", label: "Actual Total", get: (r) => r.actual, split: (r) => r.actualSplit },
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
  const breakdownKeys = new Set(cols.filter((c) => c.breakdown).map((c) => c.key));
  const GROUP_LABEL = { est: "Estimates", month: "Monthly logs", total: "Billing summary" } as const;
  const groups: { g: "est" | "month" | "total"; span: number }[] = [];
  cols.forEach((c) => { const g = groupOf(c.key); const last = groups[groups.length - 1]; if (last?.g === g) last.span++; else groups.push({ g, span: 1 }); });
  const firstOfGroup = new Set<string>();
  cols.forEach((c, i) => { if (i === 0 || groupOf(cols[i - 1].key) !== groupOf(c.key)) firstOfGroup.add(c.key); });
  const colCls = (k: string) =>
    cn(
      firstOfGroup.has(k) ? "border-l border-border" : isMonth(k) && "border-l border-border/20",
      groupOf(k) === "total" && "bg-surface-2/50",
      breakdownKeys.has(k) && "bg-background/40",
      k === "grand" && "font-semibold text-foreground",
    );

  const cell = "px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums";
  const sticky = "sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px] border-r border-border";
  const num = (v: number, fmt: (n: number) => string) =>
    Math.abs(v) < 0.005 ? <span className="text-dimmer">–</span> : fmt(v);
  const gbp = (n: number) => formatGBP(n * rate);
  /** Wraps a cell's content in a Std/Proj · CR · Bugs breakdown tooltip. */
  const withSplit = (content: ReactNode, s: Split | undefined, fmt: (n: number) => string) => {
    if (!s) return content;
    return (
      <Tooltip>
        <TooltipTrigger asChild><span className="cursor-default">{content}</span></TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">
          <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
            <span className="font-sans text-dim">Std / Proj</span><span className="text-right">{fmt(s.std)}</span>
            <span className="font-sans text-dim">Change Requests</span><span className="text-right">{fmt(s.cr)}</span>
            <span className="font-sans text-dim">Bugs</span><span className="text-right">{fmt(s.bug)}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };
  const hrs = (n: number) => `${fmtHours(n)}h`;

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
            {v === null ? "" : label === "Total" ? withSplit(num(v, opts.gbp ? gbp : fmtHours), c.split?.(total), opts.gbp ? gbp : hrs) : num(v, opts.gbp ? gbp : fmtHours)}
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
    <TooltipProvider delayDuration={150}>
    <div className="glass rounded-2xl overflow-auto max-h-[75vh] border border-border">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-surface-2 border-b border-border/60 text-[10px] uppercase tracking-[0.14em] text-dim">
            <th rowSpan={2} className={cn(sticky, "z-30 bg-surface-2 font-semibold align-bottom text-[11px] tracking-wider text-foreground/80")}>Epic <span className="normal-case text-dimmer">(hours)</span></th>
            {groups.map((g, i) => (
              <th key={g.g + i} colSpan={g.span} className="px-3 py-1.5 text-center font-semibold border-l border-border bg-surface-2">{GROUP_LABEL[g.g]}</th>
            ))}
          </tr>
          <tr className="bg-surface-2 border-b-2 border-border text-[11px] uppercase tracking-wider text-foreground/80">
            <th hidden className={cn(sticky, "z-30 bg-surface-2 font-semibold")}>Epic <span className="normal-case text-dimmer">(hours)</span></th>
            {cols.map((c) => (
              <th key={c.key} className={cn("px-3 py-2.5 text-right align-bottom font-semibold leading-tight max-w-[110px] bg-surface-2", colCls(c.key), c.key === "grand" && "text-foreground", c.breakdown && "bg-surface-1 text-dim font-medium")}>
                {c.key === "original" || c.key === "revised" ? (() => {
                  const isO = c.key === "original";
                  const open = isO ? expanded : revExpanded;
                  const word = isO ? "original" : "revised";
                  return (
                  <button
                    type="button"
                    onClick={() => (isO ? setExpanded : setRevExpanded)((v) => !v)}
                    className="inline-flex items-end gap-1 rounded-md px-1 -mx-1 text-right uppercase hover:text-primary hover:bg-primary/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    aria-expanded={open}
                    aria-label={open ? `Hide ${word} breakdown` : `Show ${word} breakdown`}
                  >
                    {open ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    {c.label}
                  </button>
                  );
                })() : (
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
                <td key={c.key} className={cn(cell, colCls(c.key), c.breakdown && "text-dim", i === 0 && "border-t-2 border-t-border")}>{withSplit(num(c.get(r), fmtHours), c.split?.(r), hrs)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>{totals(false)}</tfoot>
      </table>
    </div>
    </TooltipProvider>
  );
}
