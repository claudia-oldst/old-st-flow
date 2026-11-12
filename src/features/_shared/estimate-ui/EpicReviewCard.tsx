import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ListPagination } from "@/components/ListPagination";
import { Stat } from "./Stat";
import { EpicMiniTrendChart } from "./EpicMiniTrendChart";

const PAGE_SIZE = 6;

export interface EpicReviewTotals {
  original: number;
  current: number;
  projected: number;
  actual: number;
}

interface Props {
  projectAcronym: string;
  epicName: string;
  subtitle: ReactNode;
  totals: EpicReviewTotals;
  discountHours?: number;
  chartData: ComponentProps<typeof EpicMiniTrendChart>["data"];
  defaultOpen?: boolean;
  /** Table header cells (<th> elements). */
  columns: ReactNode;
  itemCount: number;
  /** Optional row shown when there are no items. */
  emptyRow?: ReactNode;
  /** Renders the rows for the current page slice [start, end). */
  renderRows: (start: number, end: number) => ReactNode;
}

/** Shared collapsible epic card used by Change Requests and Estimate Revisions. */
export function EpicReviewCard({
  projectAcronym, epicName, subtitle, totals, discountHours = 0, chartData,
  defaultOpen, columns, itemCount, emptyRow, renderRows,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [itemCount]);
  const start = (page - 1) * PAGE_SIZE;
  const end = page * PAGE_SIZE;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 hairline text-dim">
                {projectAcronym}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{epicName}</div>
                <div className="text-[11px] text-dimmer">{subtitle}</div>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 text-dim transition-transform shrink-0", open && "rotate-180")}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Stat label="Original" value={totals.original} />
              <Stat label="Current (approved)" value={totals.current} accent="good" />
              <Stat label="If all approved" value={totals.projected} accent="warn" />
              <Stat label="Actual" value={totals.actual} accent="gold" />
            </div>
            {discountHours > 0 && (
              <div className="text-[11px] text-health-bad font-mono">
                −{discountHours.toFixed(discountHours % 1 === 0 ? 0 : 1)}h discounted
              </div>
            )}

            {chartData.length > 1 && <EpicMiniTrendChart data={chartData} />}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <div className="hairline-t">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-dimmer">{columns}</tr>
                </thead>
                <tbody>
                  {itemCount === 0 && emptyRow}
                  {renderRows(start, end)}
                </tbody>
              </table>
              {itemCount > PAGE_SIZE && (
                <div className="px-3 py-2 hairline-t flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[11px] text-dimmer">
                    Showing {start + 1}–{Math.min(end, itemCount)} of {itemCount}
                  </div>
                  <ListPagination page={page} total={itemCount} pageSize={PAGE_SIZE} onChange={setPage} />
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
