import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ChangeRow } from "./useAllEstimateChanges";
import { Stat } from "@/features/_shared/estimate-ui/Stat";
import { EpicMiniTrendChart } from "@/features/_shared/estimate-ui/EpicMiniTrendChart";
import { computeEpicTotals, resolveChartRange } from "./epic-change/useEpicChange";
import { EpicChangeRow } from "./EpicChangeRow";

interface EpicTicket {
  id: string;
  formatted_id: string;
  title: string;
  project_id: string;
  epic_id: number | null;
  original_fe_estimate: number;
  original_be_estimate: number;
  original_project_estimate: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
}

interface Props {
  epicKey: string;
  epicName: string;
  projectAcronym: string;
  projectId: string;
  tickets: EpicTicket[];
  changes: ChangeRow[];
  approvedChanges: ChangeRow[];
  onApprove: (row: ChangeRow) => void;
  onReject: (row: ChangeRow) => void;
  onOpenTicket?: (ticketId: string) => void;
  defaultOpen?: boolean;
  range?: { from: Date; to: Date };
  /** Total discount hours for this epic across all disciplines. */
  discountHours?: number;
}

export function EpicChangeCard({
  epicName, projectAcronym, tickets, changes, approvedChanges,
  onApprove, onReject, onOpenTicket, defaultOpen, range, discountHours = 0,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const totals = useMemo(
    () => computeEpicTotals(tickets, changes, discountHours),
    [tickets, changes, discountHours],
  );

  const chartData = useMemo(() => {
    const { start, end } = resolveChartRange(range, [...approvedChanges, ...changes]);
    const buckets = 24;
    const step = Math.max(1, Math.floor((end - start) / buckets));
    const out: Array<{ label: string; original: number; current: number; projected: number }> = [];
    for (let t = start; t <= end; t += step) {
      let originalAt = 0;
      tickets.forEach((tk) => {
        originalAt += tk.original_fe_estimate + tk.original_be_estimate + tk.original_project_estimate;
      });
      let approvedDelta = 0;
      approvedChanges.forEach((c) => {
        if (new Date(c.created_at).getTime() <= t) approvedDelta += c.delta;
      });
      let matchedDelta = 0;
      changes.forEach((c) => {
        if (new Date(c.created_at).getTime() <= t) matchedDelta += c.delta;
      });
      out.push({
        label: format(new Date(t), "d MMM"),
        original: originalAt,
        current: originalAt + approvedDelta,
        projected: originalAt + approvedDelta + matchedDelta,
      });
    }
    return out;
  }, [tickets, approvedChanges, changes, range]);

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
                  {tickets.length} ticket{tickets.length === 1 ? "" : "s"} · {changes.length} change
                  {changes.length === 1 ? "" : "s"} matching
                </div>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 text-dim transition-transform shrink-0", open && "rotate-180")}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Stat label="Original" value={totals.original} />
              <Stat label="Current (approved)" value={totals.currentApproved} accent="good" />
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
                    <th className="text-left font-medium px-3 py-2">Ticket</th>
                    <th className="text-left font-medium px-2 py-2">Disc.</th>
                    <th className="text-right font-medium px-2 py-2">Prev</th>
                    <th className="text-right font-medium px-2 py-2">New</th>
                    <th className="text-right font-medium px-2 py-2">Δ</th>
                    <th className="text-left font-medium px-2 py-2">Reason</th>
                    <th className="text-left font-medium px-2 py-2">Requester</th>
                    <th className="text-left font-medium px-2 py-2">When</th>
                    <th className="text-left font-medium px-2 py-2">Status</th>
                    <th className="text-left font-medium px-2 py-2">Approved</th>
                    <th className="text-right font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <EpicChangeRow
                      key={c.id}
                      change={c}
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
