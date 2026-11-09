import { Pin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
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
  onLocalPatch,
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
  onLocalPatch?: (patch: Partial<TicketRow>) => void;
}) {
  const updateDiscipline = async (slot: "FE" | "BE", value: DisciplineStatus) => {
    const patch = slot === "FE" ? { fe_status: value } : { be_status: value };
    onLocalPatch?.(patch);
    const { error } = await supabase.from("tickets").update(patch).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const setProjectStatus = async (statusId: string) => {
    onLocalPatch?.({ status_id: statusId, project_status_override: true });
    const { error } = await supabase.from("tickets").update({ status_id: statusId }).eq("id", ticket.id);
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
    <section className="rounded-xl hairline bg-surface-2/40 p-4 space-y-3">
      <h3 className="text-sm font-semibold">Status</h3>

      {!isProj && (
        <div className="space-y-2">
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

      <div className={`flex flex-wrap items-center gap-3 ${isProj ? "" : "pt-3 hairline-t"}`}>
        <div className="w-16 text-xs font-medium text-dim">Overall</div>
        {isPMBARole ? (
          <Select value={ticket.status_id ?? undefined} onValueChange={setProjectStatus}>
            <SelectTrigger className="h-8 w-56 text-xs" aria-label="Overall status">
              <SelectValue placeholder="Pick a status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : status ? (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-2 hairline text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
            {status.name}
          </span>
        ) : (
          <span className="text-xs text-dimmer">—</span>
        )}

        {isProj || ticket.project_status_override ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-brand-gold/10 text-brand-gold ring-1 ring-brand-gold/30">
            <Pin className="h-3 w-3" /> Set manually
            {!isProj && isPMBARole && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 ml-1 px-1.5 text-[11px] gap-1 text-brand-gold hover:text-foreground"
                onClick={resetProjectStatusToAuto}
              >
                <Sparkles className="h-3 w-3" /> Reset to auto
              </Button>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-dimmer">
            <Sparkles className="h-3 w-3" /> Auto
          </span>
        )}
      </div>
    </section>
  );
}
