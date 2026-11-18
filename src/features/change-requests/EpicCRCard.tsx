import { useMemo } from "react";
import { format } from "date-fns";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { EpicReviewCard } from "@/features/_shared/estimate-ui/EpicReviewCard";
import { crEstimate, computeCRTotals } from "./epic-cr/useEpicCR";
import { useCRDeciderNames } from "./epic-cr/useCRDeciderNames";
import { EpicCRRow } from "./EpicCRRow";
import { historyRange } from "@/features/_shared/review-list/reviewList";
import { columnHeaders, type ReviewColumn } from "@/features/_shared/review-list/useHiddenColumns";

export const crColumns = (withCost: boolean): ReviewColumn[] => [
  { key: "id", label: "Ticket ID", locked: true },
  { key: "title", label: "Ticket" },
  { key: "fe", label: "FE", align: "right" },
  { key: "be", label: "BE", align: "right" },
  ...(withCost ? [{ key: "cost", label: "Cost est.", align: "right" as const }] : []),
  { key: "created", label: "Created" },
  { key: "status", label: "Status" },
  { key: "approved", label: "Approved" },
  { key: "actions", label: "Actions", align: "right", locked: true },
];

interface Props {
  epicKey: string;
  epicName: string;
  projectAcronym?: string;
  analytics?: "inline" | "toggle" | "none";
  hiddenCols?: number[];
  baselineTickets: TicketRow[];
  filteredCRs: TicketRow[];
  allCRs: TicketRow[];
  canReview: boolean;
  onApprove: (t: TicketRow) => void;
  onReject: (t: TicketRow) => void;
  onOpenTicket?: (t: TicketRow) => void;
  defaultOpen?: boolean;
  range?: { from: Date; to: Date };
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
  ratePerHour, analytics, hiddenCols,
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
    const hist = historyRange(allCRs.map((c) => new Date(c.created_at).getTime()));
    const start = range ? range.from.getTime() : hist.start;
    let end = range ? range.to.getTime() : hist.end;
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
  }, [allCRs, totals.original, range?.from, range?.to]);

  return (
    <EpicReviewCard
      projectAcronym={projectAcronym}
      epicName={epicName}
      subtitle={<>{allCRs.length} CR{allCRs.length === 1 ? "" : "s"} · {filteredCRs.length} matching</>}
      totals={totals}
      discountHours={discountHours}
      chartData={chartData}
      defaultOpen={defaultOpen}
      analytics={analytics}
      hiddenCols={hiddenCols}
      itemCount={filteredCRs.length}
      columns={columnHeaders(crColumns(ratePerHour !== undefined))}
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
