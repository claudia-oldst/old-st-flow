import { useMemo } from "react";
import { format } from "date-fns";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { EpicReviewCard } from "@/features/_shared/estimate-ui/EpicReviewCard";
import { crEstimate, computeCRTotals } from "./epic-cr/useEpicCR";
import { useCRDeciderNames } from "./epic-cr/useCRDeciderNames";
import { EpicCRRow } from "./EpicCRRow";

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
  /** When set, render a `Cost est.` column showing per-CR currency cost. */
  ratePerHour?: number;
}

export function EpicCRCard({
  epicName, projectAcronym, baselineTickets, filteredCRs, allCRs,
  canReview, onApprove, onReject, onOpenTicket, defaultOpen, range, hideReject,
  discountHours = 0,
  ratePerHour,
}: Props) {


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
    <EpicReviewCard
      projectAcronym={projectAcronym}
      epicName={epicName}
      subtitle={<>{allCRs.length} CR{allCRs.length === 1 ? "" : "s"} · {filteredCRs.length} matching</>}
      totals={totals}
      discountHours={discountHours}
      chartData={chartData}
      defaultOpen={defaultOpen}
      itemCount={filteredCRs.length}
      columns={
        <>
          <th className="text-left font-medium px-3 py-2">Ticket ID</th>
          <th className="text-left font-medium px-2 py-2">Ticket</th>
          <th className="text-right font-medium px-2 py-2">FE</th>
          <th className="text-right font-medium px-2 py-2">BE</th>
          {ratePerHour !== undefined && <th className="text-right font-medium px-2 py-2">Cost est.</th>}
          <th className="text-left font-medium px-2 py-2">Created</th>
          <th className="text-left font-medium px-2 py-2">Status</th>
          <th className="text-left font-medium px-2 py-2">Approved</th>
          <th className="text-right font-medium px-3 py-2">Actions</th>
        </>
      }
      emptyRow={
        <tr>
          <td colSpan={ratePerHour !== undefined ? 9 : 8} className="px-3 py-6 text-center text-dimmer">
            No CRs match the current filters.
          </td>
        </tr>
      }
      renderRows={(start, end) =>
        filteredCRs.slice(start, end).map((t) => (
          <EpicCRRow
            key={t.id}
            ticket={t}
            canReview={canReview}
            hideReject={hideReject}
            memberNames={memberNames}
            ratePerHour={ratePerHour}
            onApprove={onApprove}
            onReject={onReject}
            onOpenTicket={onOpenTicket}
          />
        ))
      }
    />
  );
}
