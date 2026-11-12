import { useMemo } from "react";
import { format } from "date-fns";
import type { ChangeRow } from "./useAllEstimateChanges";
import { EpicReviewCard } from "@/features/_shared/estimate-ui/EpicReviewCard";
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
      let pendingDelta = 0;
      changes.forEach((c) => {
        if (c.status !== "pending") return;
        if (new Date(c.created_at).getTime() <= t) pendingDelta += c.delta;
      });
      out.push({
        label: format(new Date(t), "d MMM"),
        original: originalAt,
        current: originalAt + approvedDelta,
        projected: originalAt + approvedDelta + pendingDelta,
      });
    }
    return out;
  }, [tickets, approvedChanges, changes, range]);

  return (
    <EpicReviewCard
      projectAcronym={projectAcronym}
      epicName={epicName}
      subtitle={<>{tickets.length} ticket{tickets.length === 1 ? "" : "s"} · {changes.length} change{changes.length === 1 ? "" : "s"} matching</>}
      totals={{ ...totals, current: totals.currentApproved }}
      discountHours={discountHours}
      chartData={chartData}
      defaultOpen={defaultOpen}
      itemCount={changes.length}
      columns={
        <>
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
        </>
      }
      renderRows={(start, end) =>
        changes.slice(start, end).map((c) => (
          <EpicChangeRow
            key={c.id}
            change={c}
            onApprove={onApprove}
            onReject={onReject}
            onOpenTicket={onOpenTicket}
          />
        ))
      }
    />
  );
}
