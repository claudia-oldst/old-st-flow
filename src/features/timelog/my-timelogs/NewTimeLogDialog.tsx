import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { LogTimeModal } from "@/features/timelog/LogTimeModal";
import { useProjectRole } from "@/features/team/useProjectRole";
import { fetchTicketDetail } from "@/features/tickets/fetchTicketDetail";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { displayTitle } from "@/lib/utils";
import { useMyProjects, useMyProjectTickets } from "./useMyTimeLogs";

/**
 * Project → ticket picker that hands off to the existing Log Time modal,
 * so discipline gating, estimate checks and capacity warnings stay identical.
 */
export function NewTimeLogDialog({
  open,
  onOpenChange,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLogged?: () => void;
}) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  const { data: projects = [] } = useMyProjects();
  const { data: tickets = [] } = useMyProjectTickets(projectId);
  const role = useProjectRole(projectId ?? undefined);

  useEffect(() => {
    if (open) {
      setProjectId(null);
      setTicket(null);
    }
  }, [open]);

  const pickTicket = async (id: string) => {
    setLoadingTicket(true);
    const detail = await fetchTicketDetail(id);
    setLoadingTicket(false);
    if (!detail) {
      toast.error("Ticket not found");
      return;
    }
    setTicket(detail);
  };

  if (ticket) {
    return (
      <LogTimeModal
        open={open}
        onOpenChange={(v) => {
          if (!v) setTicket(null);
          onOpenChange(v);
        }}
        ticket={ticket}
        role={role}
        onLogged={onLogged}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Log time
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Project</Label>
            <Select value={projectId ?? ""} onValueChange={(v) => setProjectId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Ticket</Label>
            <Select
              value=""
              disabled={!projectId || loadingTicket}
              onValueChange={pickTicket}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !projectId
                      ? "Pick a project first"
                      : tickets.length === 0
                      ? "No tickets assigned to you here"
                      : "Select a ticket"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {tickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="font-mono text-xs mr-2">{t.formatted_id}</span>
                    {displayTitle(t.title, t.ticket_type as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-dimmer">
              Only tickets you are assigned to are listed.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
