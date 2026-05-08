import { useMemo, useState } from "react";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { healthRatio } from "@/lib/utils";
import { EstimateEvolution } from "@/features/health/EstimateEvolution";
import { defaultRange, type DateRange } from "@/features/health/DateRangeControl";
import { Ring } from "./overview/Ring";
import { HealthSummaryRow } from "./overview/HealthSummaryRow";
import { useProjectHealth } from "./overview/useProjectHealth";

export function ProjectHealth({ projectId }: { projectId: string }) {
  const { tickets } = useProjectTickets(projectId);
  const { statuses } = useStatuses();
  const [range, setRange] = useState<DateRange>(() => defaultRange());

  const { members, weekHours, ticketsByMember, remainingByMember } = useProjectHealth({
    projectId,
    tickets,
    range,
  });

  const openTickets = useMemo(() => {
    const doneIds = new Set(statuses.filter((s) => s.category === "done").map((s) => s.id));
    return tickets.filter((t) => !doneIds.has(t.status_id ?? ""));
  }, [tickets, statuses]);

  const totals = useMemo(() => {
    return tickets.reduce(
      (acc, t) => {
        acc.feEst += t.current_fe_estimate;
        acc.beEst += t.current_be_estimate;
        acc.projEst += t.current_project_estimate;
        acc.feOrig += t.original_fe_estimate;
        acc.beOrig += t.original_be_estimate;
        acc.projOrig += t.original_project_estimate;
        acc.feAct += t.actual_frontend_hours;
        acc.beAct += t.actual_backend_hours;
        acc.projAct += t.actual_project_hours;
        return acc;
      },
      {
        feEst: 0, beEst: 0, projEst: 0,
        feOrig: 0, beOrig: 0, projOrig: 0,
        feAct: 0, beAct: 0, projAct: 0,
      }
    );
  }, [tickets]);

  const totalEst = totals.feEst + totals.beEst + totals.projEst;
  const totalOrig = totals.feOrig + totals.beOrig + totals.projOrig;
  const totalAct = totals.feAct + totals.beAct + totals.projAct;
  const overall = healthRatio(totalAct, totalEst);
  const profitabilityPct = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : 0;
  const profitabilityOrigPct = totalOrig > 0 ? Math.round((totalAct / totalOrig) * 100) : 0;

  const unassignedCount = openTickets.filter((t) => t.assignees.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Ring title="Frontend" actual={totals.feAct} estimate={totals.feEst} original={totals.feOrig} />
        <Ring title="Backend" actual={totals.beAct} estimate={totals.beEst} original={totals.beOrig} />
        <Ring title="Project" actual={totals.projAct} estimate={totals.projEst} original={totals.projOrig} />
      </div>

      <HealthSummaryRow
        members={members}
        range={range}
        setRange={setRange}
        ticketsByMember={ticketsByMember}
        remainingByMember={remainingByMember}
        weekHours={weekHours}
        overall={overall}
        profitabilityPct={profitabilityPct}
        profitabilityOrigPct={profitabilityOrigPct}
        totalEst={totalEst}
        totalOrig={totalOrig}
        totalAct={totalAct}
        unassignedCount={unassignedCount}
      />

      <EstimateEvolution projectId={projectId} />
    </div>
  );
}
