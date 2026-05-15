import { Bookmark, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";
import { displayTitle } from "@/lib/utils";

export function TicketDetailHeader({
  ticket,
  status,
  editing,
  title,
  setTitle,
}: {
  ticket: TicketRow;
  status: Status | undefined;
  editing: boolean;
  title: string;
  setTitle: (v: string) => void;
}) {
  return (
    <SheetHeader className="space-y-2 shrink-0">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-dimmer">{ticket.formatted_id}</span>
        {status && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ring-1 ring-white/10" style={{ background: `${status.color}22`, color: status.color }}>
            {status.name}
            {!ticket.project_status_override && (
              <Sparkles className="h-2.5 w-2.5 opacity-70" />
            )}
          </span>
        )}
        {ticket.ticket_type !== "Standard" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline">{ticket.ticket_type}</span>
        )}
        {ticket.ticket_type === "CR" && (
          <CRStatusBadge status={ticket.cr_approval} />
        )}
        {ticket.epic_name && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline">
            <Bookmark className="h-2.5 w-2.5" /> {ticket.epic_name}
          </span>
        )}
        {ticket.version && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline font-mono">
            {ticket.version}
          </span>
        )}
      </div>
      <SheetTitle className="text-left text-xl">
        {editing ? (
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl" />
        ) : (
          displayTitle(ticket.title, ticket.ticket_type)
        )}
      </SheetTitle>
    </SheetHeader>
  );
}
