import { format } from "date-fns";
import { Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import type { ChangeRow } from "./useAllEstimateChanges";
import { StatusBadge } from "@/features/_shared/estimate-ui/StatusBadge";

interface Props {
  change: ChangeRow;
  onApprove: (row: ChangeRow) => void;
  onReject: (row: ChangeRow) => void;
  onOpenTicket?: (ticketId: string) => void;
}

export function EpicChangeRow({ change: c, onApprove, onReject, onOpenTicket }: Props) {
  const isAuto = (c.reason ?? "").startsWith("Auto-trimmed");
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2 font-mono text-[11px]">
        <TooltipProvider>
          <UiTooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => c.ticket && onOpenTicket?.(c.ticket.id)}
                className="text-foreground hover:text-primary transition cursor-pointer"
              >
                {c.ticket?.formatted_id ?? "?"}
              </button>
            </TooltipTrigger>
            {c.ticket?.title && (
              <TooltipContent side="top" align="start" className="max-w-xs">
                <p className="text-sm">{c.ticket.title}</p>
              </TooltipContent>
            )}
          </UiTooltip>
        </TooltipProvider>
      </td>
      <td className="px-2 py-2 text-dim">{c.discipline}</td>
      <td className="px-2 py-2 text-right font-mono text-dim">{formatHours(c.previous_hours)}</td>
      <td className="px-2 py-2 text-right font-mono">{formatHours(c.new_hours)}</td>
      <td
        className={cn(
          "px-2 py-2 text-right font-mono",
          c.delta > 0 ? "text-health-warn" : c.delta < 0 ? "text-health-good" : "text-dim",
        )}
      >
        {c.delta > 0 ? "+" : ""}
        {formatHours(c.delta)}
      </td>
      <td className="px-2 py-2 max-w-[260px]">
        <div className="flex items-center gap-1.5">
          {isAuto && (
            <span
              title="Auto-generated"
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/5 text-[9px] uppercase tracking-wider text-dimmer"
            >
              <Sparkles className="h-2.5 w-2.5" /> auto
            </span>
          )}
          <span className="text-dim truncate" title={c.reason ?? ""}>
            {c.reason ?? "—"}
          </span>
        </div>
      </td>
      <td className="px-2 py-2">
        {c.requester ? (
          <div className="flex items-center gap-1.5">
            <MemberAvatar name={c.requester.name} color={c.requester.avatar_color} size="xs" />
            <span className="text-dim truncate">{c.requester.name}</span>
          </div>
        ) : (
          <span className="text-dimmer">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-dimmer whitespace-nowrap">
        {format(new Date(c.created_at), "d MMM")}
      </td>
      <td className="px-2 py-2"><StatusBadge status={c.status} /></td>
      <td className="px-2 py-2 text-dimmer whitespace-nowrap">
        {c.status === "approved" && c.decided_at ? format(new Date(c.decided_at), "d MMM") : "—"}
      </td>
      <td className="px-3 py-2 text-right">
        {c.status === "pending" ? (
          <div className="inline-flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-health-good hover:text-health-good hover:bg-health-good/10"
              onClick={() => onApprove(c)}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-health-bad hover:text-health-bad hover:bg-health-bad/10"
              onClick={() => onReject(c)}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          </div>
        ) : (
          <span className="text-dimmer text-[10px]">—</span>
        )}
      </td>
    </tr>
  );
}
