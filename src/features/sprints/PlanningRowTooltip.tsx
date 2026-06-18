import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DISCIPLINE_STATUS_LABEL } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";

interface Props {
  ticket: TicketRow;
  children: React.ReactNode;
}

/** Wraps a planning row with a hover tooltip:
 *  "<Project Status>: <Title> (FE: <fe status>, BE: <be status>)" */
export function PlanningRowTooltip({ ticket, children }: Props) {
  const { statuses } = useStatuses();
  const projectStatus = ticket.status_id
    ? statuses.find((s) => s.id === ticket.status_id)?.name ?? "No status"
    : "No status";
  const fe = DISCIPLINE_STATUS_LABEL[ticket.fe_status];
  const be = DISCIPLINE_STATUS_LABEL[ticket.be_status];
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-md">
        <div className="text-xs">
          <span className="font-semibold">{projectStatus}:</span>{" "}
          <span>{ticket.title}</span>{" "}
          <span className="text-dimmer">(FE: {fe}, BE: {be})</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
