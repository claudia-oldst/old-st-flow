import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { Stat } from "@/features/_shared/estimate-ui/Stat";
import { EpicMiniTrendChart } from "@/features/_shared/estimate-ui/EpicMiniTrendChart";
import { crEstimate, computeCRTotals } from "./epic-cr/useEpicCR";
import { useCRDeciderNames } from "./epic-cr/useCRDeciderNames";
import { EpicCRRow } from "./EpicCRRow";
import { ListPagination } from "@/components/ListPagination";

const PAGE_SIZE = 6;

interface Props {
  epicKey: string;
  epicName: string;
  projectAcronym: string;
  baselineTickets: TicketRow[];
  filteredCRs: TicketRow[];
  allCRs: TicketRow[];
  canReview: boolean;
  onApprove: (t: TicketRow) => void;
  onReject: (t: TicketRow) => void;
  onOpenTicket?: (t: TicketRow) => void;
  defaultOpen?: boolean;
  range: { from: Date; to: Date };
  hideReject?: boolean;
  /** Total discount hours for this epic across all disciplines. */
  discountHours?: number;
}

export function EpicCRCard({
  epicName, projectAcronym, baselineTickets, filteredCRs, allCRs,
  canReview, onApprove, onReject, onOpenTicket, defaultOpen, range, hideReject,
  discountHours = 0,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filteredCRs.length]);

  const deciderIds = useMemo(
    () => allCRs
      .filter((t) => t.cr_approval === "approved" && t.cr_decided_by)
      .map((t) => t.cr_decided_by as string),
    [allCRs],
  );
  const memberNames = useCRDeciderNames(deciderIds);

  const totals = useMemo(
    () => computeCRTotals(baselineTickets, allCRs, discountHours),
    [baselineTickets, allCRs, discountHours],
  );

  const chartData = useMemo(() => {
    const start = range.from.getTime();
    let end = range.to.getTime();
    if (end <= start) end = start + 86_400_000;
    const buckets = 24;
    const step = Math.max(1, Math.floor((end - start) / buckets));
    const out: Array<{ label: string; original: number; current: number; projected: number }> = [];
    for (let t = start; t <= end; t += step) {
      let approved = 0;
      let pending = 0;
      allCRs.forEach((c) => {
        if (c.cr_approval === "approved") {
          const ts = c.cr_decided_at ? new Date(c.cr_decided_at).getTime() : Number.POSITIVE_INFINITY;
          if (ts <= t) approved += crEstimate(c);
        } else if (c.cr_approval === "pending") {
          const ts = new Date(c.created_at).getTime();
          if (ts <= t) pending += crEstimate(c);
        }
      });
      out.push({
        label: format(new Date(t), "d MMM"),
        original: totals.original,
        current: totals.original + approved,
        projected: totals.original + approved + pending,
      });
    }
    return out;
  }, [allCRs, totals.original, range.from, range.to]);

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
                <div className="text-[11px] text-dimmer">
                  {allCRs.length} CR{allCRs.length === 1 ? "" : "s"} · {filteredCRs.length} matching
                </div>
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
                  <tr className="text-[10px] uppercase tracking-wider text-dimmer">
                    <th className="text-left font-medium px-3 py-2">Ticket ID</th>
                    <th className="text-left font-medium px-2 py-2">Ticket</th>
                    <th className="text-right font-medium px-2 py-2">FE</th>
                    <th className="text-right font-medium px-2 py-2">BE</th>
                    <th className="text-left font-medium px-2 py-2">Created</th>
                    <th className="text-left font-medium px-2 py-2">Status</th>
                    <th className="text-left font-medium px-2 py-2">Approved</th>
                    <th className="text-right font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCRs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-dimmer">
                        No CRs match the current filters.
                      </td>
                    </tr>
                  )}
                  {filteredCRs.map((t) => (
                    <EpicCRRow
                      key={t.id}
                      ticket={t}
                      canReview={canReview}
                      hideReject={hideReject}
                      memberNames={memberNames}
                      onApprove={onApprove}
                      onReject={onReject}
                      onOpenTicket={onOpenTicket}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
