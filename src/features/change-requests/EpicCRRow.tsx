import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { StatusBadge } from "@/features/_shared/estimate-ui/StatusBadge";

interface Props {
  ticket: TicketRow;
  canReview: boolean;
  hideReject?: boolean;
  memberNames: Record<string, string>;
  onApprove: (t: TicketRow) => void;
  onReject: (t: TicketRow) => void;
  onOpenTicket?: (t: TicketRow) => void;
}

export function EpicCRRow({
  ticket: t, canReview, hideReject, memberNames,
  onApprove, onReject, onOpenTicket,
}: Props) {
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2 font-mono text-[11px]">
        <button
          type="button"
          onClick={() => onOpenTicket?.(t)}
          className="text-foreground hover:text-primary transition"
        >
          {t.formatted_id}
        </button>
      </td>
      <td className="px-2 py-2 max-w-[420px]">
        <span className="truncate block" title={t.title}>{t.title}</span>
      </td>
      <td className="px-2 py-2 text-right font-mono text-dim">{formatHours(t.current_fe_estimate)}</td>
      <td className="px-2 py-2 text-right font-mono text-dim">{formatHours(t.current_be_estimate)}</td>
      <td className="px-2 py-2 text-dimmer whitespace-nowrap">
        {format(new Date(t.created_at), "d MMM")}
      </td>
      <td className="px-2 py-2"><StatusBadge status={t.cr_approval} /></td>
      <td className="px-2 py-2 text-dimmer whitespace-nowrap">
        {t.cr_approval === "approved" && t.cr_decided_at ? (
          <div className="flex flex-col leading-tight">
            <span>{format(new Date(t.cr_decided_at), "d MMM")}</span>
            {t.cr_decided_by === null ? (
              <span className="text-[10px] text-health-good font-mono" title="Approved by client">
                Client
              </span>
            ) : (
              <span
                className="text-[10px] text-dim truncate max-w-[140px]"
                title={memberNames[t.cr_decided_by] ?? ""}
              >
                {memberNames[t.cr_decided_by] ?? "…"}
              </span>
            )}
          </div>
        ) : "—"}
      </td>
      <td className="px-3 py-2 text-right">
        {canReview && t.cr_approval === "pending" ? (
          <div className="inline-flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-health-good hover:text-health-good hover:bg-health-good/10"
              onClick={() => onApprove(t)}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
            {!hideReject && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-health-bad hover:text-health-bad hover:bg-health-bad/10"
                onClick={() => onReject(t)}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            )}
          </div>
        ) : (
          <span className="text-dimmer text-[10px]">—</span>
        )}
      </td>
    </tr>
  );
}
