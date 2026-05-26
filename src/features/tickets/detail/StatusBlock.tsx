import { Pin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { syncTicketToGithub } from "@/features/github/syncTicket";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DisciplineStatus, Status } from "@/lib/types";
import { DisciplineRow } from "./DisciplineRow";

export function StatusBlock({
  ticket,
  statuses,
  status,
  isPMBARole,
  isProj,
  hasFE,
  hasBE,
  canEditFE,
  canEditBE,
  onAssign,
  onChange,
}: {
  ticket: TicketRow;
  statuses: Status[];
  status: Status | undefined;
  isPMBARole: boolean;
  isProj: boolean;
  hasFE: boolean;
  hasBE: boolean;
  canEditFE: boolean;
  canEditBE: boolean;
  onAssign: () => void;
  onChange: () => void;
}) {
  const updateDiscipline = async (slot: "FE" | "BE", value: DisciplineStatus) => {
    const patch = slot === "FE" ? { fe_status: value } : { be_status: value };
    const { error } = await supabase.from("tickets").update(patch).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const setProjectStatus = async (statusId: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status_id: statusId })
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const resetProjectStatusToAuto = async () => {
    const { error } = await supabase
      .from("tickets")
      .update({ project_status_override: false, fe_status: ticket.fe_status })
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);
    toast.success("Project status set to auto");
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wider text-dimmer">Status</div>

      {!isProj && (
        <div className="rounded-xl hairline bg-white/[0.02] p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-dimmer uppercase tracking-wider">
            Discipline
          </div>
          <DisciplineRow
            slot="FE"
            value={ticket.fe_status}
            canEdit={canEditFE}
            hasAssignee={hasFE}
            onAssign={isPMBARole ? onAssign : undefined}
            onChange={(v) => updateDiscipline("FE", v)}
          />
          <DisciplineRow
            slot="BE"
            value={ticket.be_status}
            canEdit={canEditBE}
            hasAssignee={hasBE}
            onAssign={isPMBARole ? onAssign : undefined}
            onChange={(v) => updateDiscipline("BE", v)}
          />
        </div>
      )}

      <div className="rounded-xl hairline bg-white/[0.02] p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-dimmer uppercase tracking-wider">Project status</div>
          {isProj ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-dim">
              <Pin className="h-2.5 w-2.5" /> Manual
            </span>
          ) : ticket.project_status_override ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/80">
              <Pin className="h-2.5 w-2.5" /> Manual override
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-dim">
              <Sparkles className="h-2.5 w-2.5" /> Auto from FE/BE
            </span>
          )}
        </div>
        {isPMBARole ? (
          <div className="flex items-center gap-2">
            <Select value={ticket.status_id ?? undefined} onValueChange={setProjectStatus}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Pick a status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ticket.project_status_override && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={resetProjectStatusToAuto}>
                <Sparkles className="h-3 w-3" /> Auto
              </Button>
            )}
          </div>
        ) : status ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
            {status.name}
          </span>
        ) : (
          <span className="text-xs text-dimmer">—</span>
        )}
      </div>
    </div>
  );
}
