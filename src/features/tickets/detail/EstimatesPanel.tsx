import { Edit3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { formatHours } from "@/lib/utils";
import { Stat } from "./Stat";
import { EstimateChangesPanel } from "./EstimateChangesPanel";

export function EstimatesPanel({
  ticket,
  isProj,
  isPMBARole,
  canEditFE,
  canEditBE,
  canEditProj,
  editing,
  setEditing,
  feEst, setFeEst,
  beEst, setBeEst,
  projEst, setProjEst,
  onSave,
  onAdjustEstimate,
  estimateChanges,
}: {
  ticket: TicketRow;
  isProj: boolean;
  isPMBARole: boolean;
  canEditFE: boolean;
  canEditBE: boolean;
  canEditProj: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  feEst: string; setFeEst: (v: string) => void;
  beEst: string; setBeEst: (v: string) => void;
  projEst: string; setProjEst: (v: string) => void;
  onSave: () => void;
  onAdjustEstimate: (slot?: "FE" | "BE") => void;
  estimateChanges: any[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-dimmer">Estimates & actuals</div>
        <div className="flex items-center gap-1">
          {!editing && !isProj && (canEditFE || canEditBE) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (canEditFE && !canEditBE) onAdjustEstimate("FE");
                else if (canEditBE && !canEditFE) onAdjustEstimate("BE");
                else onAdjustEstimate(undefined);
              }}
              className="gap-1 text-xs"
            >
              <TrendingUp className="h-3 w-3" /> Adjust estimate
            </Button>
          )}
          {(isPMBARole || (isProj && canEditProj)) && !editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
              <Edit3 className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>
      </div>
      {editing ? (
        isProj ? (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Project estimate (hrs)</Label>
              <Input type="number" step="0.5" value={projEst} onChange={(e) => setProjEst(e.target.value)} />
              <div className="text-[10px] text-dimmer">Original: {formatHours(ticket.original_project_estimate)}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={onSave}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">FE estimate (hrs)</Label>
              <Input type="number" step="0.5" value={feEst} onChange={(e) => setFeEst(e.target.value)} />
              <div className="text-[10px] text-dimmer">Original: {formatHours(ticket.original_fe_estimate)}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">BE estimate (hrs)</Label>
              <Input type="number" step="0.5" value={beEst} onChange={(e) => setBeEst(e.target.value)} />
              <div className="text-[10px] text-dimmer">Original: {formatHours(ticket.original_be_estimate)}</div>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={onSave}>Save</Button>
            </div>
          </div>
        )
      ) : isProj ? (
        <Stat
          label="Project"
          actual={ticket.actual_project_hours}
          estimate={ticket.current_project_estimate}
          original={ticket.original_project_estimate}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Frontend"
            actual={ticket.actual_frontend_hours}
            estimate={ticket.current_fe_estimate}
            original={ticket.original_fe_estimate}
          />
          <Stat
            label="Backend"
            actual={ticket.actual_backend_hours}
            estimate={ticket.current_be_estimate}
            original={ticket.original_be_estimate}
          />
        </div>
      )}
      {!isProj && ticket.actual_project_hours > 0 && (
        <div className="mt-3 text-xs text-dim">
          Project contributors logged: <span className="text-foreground font-mono">{formatHours(ticket.actual_project_hours)}</span>
          {ticket.current_project_estimate > 0 && (
            <> / <span className="text-foreground font-mono">{formatHours(ticket.current_project_estimate)}</span></>
          )}
        </div>
      )}

      <EstimateChangesPanel changes={estimateChanges as any} />
    </div>
  );
}
