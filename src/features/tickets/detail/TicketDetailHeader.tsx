import { Bookmark, GitBranch, Sparkles, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status, TicketType } from "@/lib/types";
import { displayTitle } from "@/lib/utils";
import { StatusBadge } from "@/features/_shared/estimate-ui/StatusBadge";
import { GithubIssueBadge } from "@/features/github/GithubIssueBadge";
import { emitOpenTicket } from "@/features/tickets/openTicketEvent";


export function TicketDetailHeader({
  ticket,
  status,
  editing,
  title,
  setTitle,
  canEdit = false,
  onStartEdit,
  onSave,
  onCancel,
}: {
  canEdit?: boolean;
  onStartEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
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
        <GithubIssueBadge projectId={ticket.project_id} issueNumber={ticket.github_issue_number} />
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
          <StatusBadge status={ticket.cr_approval} />
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
        {ticket.parent && (
          <button
            type="button"
            onClick={() => ticket.parent && emitOpenTicket(ticket.parent.id)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 hairline hover:bg-white/10 hover:text-foreground transition cursor-pointer"
            title={`Open parent: ${ticket.parent.title}`}
          >
            <GitBranch className="h-2.5 w-2.5" />
            <span className="font-mono">{ticket.parent.formatted_id}</span>
          </button>
        )}
      </div>
      <SheetTitle className="text-left text-xl">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); onSave?.(); }
                if (e.key === "Escape") { e.preventDefault(); onCancel?.(); }
              }}
              className="text-xl"
            />
            <Button size="sm" variant="ghost" onClick={onSave} className="h-8 w-8 p-0" aria-label="Save title">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 w-8 p-0" aria-label="Cancel">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="group flex items-center gap-2">
            <span>{displayTitle(ticket.title, ticket.ticket_type)}</span>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onStartEdit}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                aria-label="Edit title"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </SheetTitle>
    </SheetHeader>
  );
}
