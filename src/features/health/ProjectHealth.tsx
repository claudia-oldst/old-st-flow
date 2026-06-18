import { useMemo, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import { healthRatio, formatHours } from "@/lib/utils";
import { EstimateEvolution } from "@/features/health/EstimateEvolution";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import {
  discountTotalsByDiscipline,
  sumTotals,
} from "@/features/discounts/applyDiscounts";
import { CreateDiscountsDialog } from "@/features/discounts/CreateDiscountsDialog";
import { DiscountsList } from "@/features/discounts/DiscountsList";
import { Ring } from "./overview/Ring";
import { ProfitabilityPill } from "./overview/ProfitabilityPill";
import { WeeklyBurnPanel } from "./overview/WeeklyBurnPanel";
import { EpicRiskTable } from "./overview/EpicRiskTable";

export function ProjectHealth({ projectId }: { projectId: string }) {
  const { tickets } = useProjectTickets(projectId);
  const { statuses } = useStatuses();
  const role = useProjectRole(projectId);
  const canManageDiscounts = isPMBA(role);
  const { epics } = useProjectEpics(projectId);
  const { discounts } = useEpicDiscounts(projectId);
  const [discountsOpen, setDiscountsOpen] = useState(false);

  const { data: projectStart } = useQuery({
    queryKey: ["projectStartDate", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("start_date")
        .eq("id", projectId)
        .maybeSingle();
      return (data?.start_date as string | null) ?? null;
    },
  });

  const openTickets = useMemo(() => {
    const doneIds = new Set(statuses.filter((s) => s.category === "done").map((s) => s.id));
    return tickets.filter((t) => !doneIds.has(t.status_id ?? ""));
  }, [tickets, statuses]);

  const totals = useMemo(() => {
    // Parse as local time (no Z suffix) so the boundary aligns with how
    // created_at is compared elsewhere in the app.
    const startMs = projectStart
      ? (() => {
          const d = new Date(`${projectStart}T00:00:00`);
          d.setHours(23, 59, 59, 999);
          return d.getTime();
        })()
      : null;
    return tickets.reduce(
      (acc, t) => {
        acc.feEst += t.current_fe_estimate;
        acc.beEst += t.current_be_estimate;
        acc.projEst += t.current_project_estimate;
        const inOriginal =
          startMs == null ? false : new Date(t.created_at).getTime() <= startMs;
        if (inOriginal) {
          acc.feOrig += t.original_fe_estimate;
          acc.beOrig += t.original_be_estimate;
          acc.projOrig += t.original_project_estimate;
        }
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
  }, [tickets, projectStart]);

  const discountTotals = useMemo(
    () => discountTotalsByDiscipline(discounts),
    [discounts],
  );
  const totalDiscount = sumTotals(discountTotals);

  const totalEst = totals.feEst + totals.beEst + totals.projEst;
  const totalOrig = totals.feOrig + totals.beOrig + totals.projOrig;
  const totalAct = totals.feAct + totals.beAct + totals.projAct;
  const effectiveAct = Math.max(0, totalAct - totalDiscount);

  const overall = healthRatio(effectiveAct, totalEst);
  const profitabilityPct = totalEst > 0 ? Math.round((effectiveAct / totalEst) * 100) : 0;
  const profitabilityOrigPct = totalOrig > 0 ? Math.round((effectiveAct / totalOrig) * 100) : 0;

  const unassignedCount = openTickets.filter((t) => t.assignees.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs uppercase tracking-wider text-dimmer">Hour burn</div>
        {canManageDiscounts && (
          <Button size="sm" onClick={() => setDiscountsOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create discount
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Ring title="Frontend" actual={totals.feAct} estimate={totals.feEst} original={totals.feOrig} discounted={discountTotals.FE} />
        <Ring title="Backend" actual={totals.beAct} estimate={totals.beEst} original={totals.beOrig} discounted={discountTotals.BE} />
        <Ring title="Project" actual={totals.projAct} estimate={totals.projEst} original={totals.projOrig} discounted={discountTotals.Project} />
        <WeeklyBurnPanel projectId={projectId} tickets={tickets} />
      </div>

      {discounts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-dimmer px-1">
            Discounts ({discounts.length})
          </div>
          <DiscountsList projectId={projectId} epics={epics} canManage={canManageDiscounts} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Profitability</div>
          <div className="flex items-center gap-3">
            <ProfitabilityPill state={overall} />
            <div>
              <div className="text-2xl font-semibold font-mono ticker">{profitabilityPct}%</div>
              <div className="text-xs text-dim">of estimate burned</div>
              {totalOrig > 0 && (
                <div className="text-[11px] text-dimmer mt-0.5 font-mono">
                  {profitabilityOrigPct}% <span className="font-sans">of original</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 grid grid-cols-3 gap-3 text-xs border-t border-white/5">
            <div>
              <div className="text-dimmer">Total est.</div>
              <div className="font-mono">{formatHours(totalEst)}</div>
            </div>
            <div>
              <div className="text-dimmer">Original</div>
              <div className="font-mono">{totalOrig > 0 ? formatHours(totalOrig) : "—"}</div>
            </div>
            <div>
              <div className="text-dimmer">Total actual</div>
              <div className="font-mono">{formatHours(effectiveAct)}</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Unassigned backlog</div>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${unassignedCount > 0 ? "text-health-warn" : "text-dimmer"}`} />
            <div className="text-2xl font-semibold font-mono ticker">{unassignedCount}</div>
          </div>
          <div className="text-xs text-dim mt-1">Open tickets with no assignee</div>
        </div>
      </div>

      <EpicRiskTable projectId={projectId} tickets={tickets} statuses={statuses} epics={epics} />

      <EstimateEvolution projectId={projectId} />

      <CreateDiscountsDialog
        open={discountsOpen}
        onOpenChange={setDiscountsOpen}
        projectId={projectId}
      />
    </div>
  );
}
