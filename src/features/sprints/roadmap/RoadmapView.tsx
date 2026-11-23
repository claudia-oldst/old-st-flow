import { useCallback, useMemo, useState } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { BulkAssignDialog } from "@/features/tickets/BulkAssignDialog";
import type { Sprint, SprintDiscipline } from "../types";
import { useRoadmapData } from "./useRoadmapData";
import { useRoadmapView } from "./useRoadmapView";
import { useRoadmapMutations, type TicketPlan } from "./useRoadmapMutations";
import { useClosedSprintConfirm } from "./useClosedSprintConfirm";
import { isClosed, planCell, type CellState, type SprintLite } from "./cellRules";
import { WorkingSprintBar } from "./WorkingSprintBar";
import { RoadmapToolbar } from "./RoadmapToolbar";
import { TicketsList } from "@/features/tickets/TicketsList";
import { sprintColumns } from "./sprintColumns";
import { RoadmapBulkBar, type BulkDisc } from "./RoadmapBulkBar";

const WORD: Record<CellState, string> = { none: "removed from", planned: "planned into", committed: "committed to" };

export function RoadmapView({ projectId, sprints, isPMBA }: { projectId: string; sprints: Sprint[]; isPMBA: boolean }) {
  const d = useRoadmapData(projectId, sprints);
  const v = useRoadmapView(projectId, sprints, d);
  const { apply } = useRoadmapMutations(projectId);
  const closed = useClosedSprintConfirm();
  const [selected, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkAssign, setBulkAssign] = useState(false);
  const byNum = useMemo(() => new Map(v.sorted.map((s) => [s.id, s.sprint_number])), [v.sorted]);

  const planFor = useCallback((t: TicketRow, s: SprintLite, disc: SprintDiscipline, to: CellState): TicketPlan => ({
    ticketId: t.id, discipline: disc,
    plan: planCell({
      ticketId: t.id, discipline: disc, sprint: s, sprints: v.sorted, today: d.today,
      plannedId: (disc === "FE" ? d.plannedByTicket.get(t.id)?.fe : d.plannedByTicket.get(t.id)?.be) ?? null,
      commitments: (d.commitsByTicket.get(t.id) ?? []).filter((c) => c.discipline === disc),
    }, to),
  }), [v.sorted, d.today, d.plannedByTicket, d.commitsByTicket]);

  const onSet = useCallback(async (t: TicketRow, s: SprintLite, disc: SprintDiscipline, to: CellState) => {
    if (isClosed(s, d.today) && !(await closed.ask(s))) return;
    const p = planFor(t, s, disc, to);
    const prev = disc === "FE" ? d.plannedByTicket.get(t.id)?.fe : d.plannedByTicket.get(t.id)?.be;
    const moved = p.plan.planned && prev && prev !== s.id ? ` (moved from Sprint ${byNum.get(prev)})` : "";
    const dropped = p.plan.remove.filter((r) => r.sprint_id !== s.id).map((r) => `S${byNum.get(r.sprint_id)}`);
    const extra = dropped.length ? ` · removed from ${dropped.join(", ")}` : "";
    await apply([p], `${t.formatted_id} ${disc} ${WORD[to]} Sprint ${s.sprint_number}${moved}${extra}`);
  }, [apply, planFor, closed, d.today, d.plannedByTicket, byNum]);

  const onBulk = async (bd: BulkDisc, to: CellState) => {
    const s = v.working;
    if (!s) return;
    if (isClosed(s, d.today) && !(await closed.ask(s))) return;
    const discs: SprintDiscipline[] = bd === "both" ? ["FE", "BE"] : [bd];
    const plans = v.rows.filter((t) => selected.has(t.id)).flatMap((t) => discs.map((x) => planFor(t, s, x, to)));
    await apply(plans, `${plans.length} cell${plans.length === 1 ? "" : "s"} ${WORD[to]} Sprint ${s.sprint_number}`);
  };

  const setSelected = useCallback((ids: string[], on: boolean) => setSel((prev) => {
    const n = new Set(prev); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n;
  }), []);

  const toggleDev = (uid: string) => {
    const a = v.filters.assignees;
    v.setFilters({ ...v.filters, assignees: a.includes(uid) ? a.filter((x) => x !== uid) : [...a, uid] });
  };

  const openTicket = d.tickets.find((t) => t.id === openId) ?? null;
  const capsSimple = useMemo(() => new Map([...d.capsBySprint].map(([k, c]) => [k, { FE: c.FE, BE: c.BE }])), [d.capsBySprint]);

  const columns = useMemo(() => sprintColumns({
    sprints: v.colSprints, workingId: v.working?.id, totals: d.totalsBySprint, caps: capsSimple,
    commitsByTicket: d.commitsByTicket, plannedByTicket: d.plannedByTicket, isSplit: v.split, editable: isPMBA, onSet,
  }), [v.colSprints, v.working?.id, d.totalsBySprint, capsSimple, d.commitsByTicket, d.plannedByTicket, v.split, isPMBA, onSet]);

  if (!sprints.length) return <div className="hairline rounded-md p-6 text-center text-sm text-dim">Create a sprint on the Sprints tab first.</div>;

  return (
    <div className="space-y-3">
      <WorkingSprintBar
        sprints={v.sorted} working={v.working} onPick={v.setWorking} today={d.today} members={d.members}
        totals={v.working && d.totalsBySprint.get(v.working.id)} caps={v.working && d.capsBySprint.get(v.working.id)}
        activeDevIds={v.filters.assignees} onDevClick={toggleDev}
      />
      <RoadmapToolbar
        search={v.search} setSearch={v.setSearch} ai={v.ai} getCandidates={() => v.filtered}
        filters={v.filters} setFilters={v.setFilters} options={v.options} sprints={v.sorted}
        working={v.working} previous={v.previous} groupBy={v.groupBy} setGroupBy={v.setGroupBy}
        cols={v.colIds} setCols={v.setCols}
      />
      {d.loading && <div className="text-[11px] text-dimmer">Loading more tickets…</div>}
      {v.rows.length === 0 ? (
        <div className="glass rounded-2xl text-sm text-dim text-center py-10">No tickets match these filters.</div>
      ) : (
        <TicketsList
          tickets={v.rows} groupBy={v.groupBy} projectId={projectId} loadingMore={d.loading}
          columns={["id", "title", "status", "dev_status", "fe", "be", "assignees"]}
          onOpen={(t) => setOpenId(t.id)}
          selectedIds={selected}
          onToggleSelect={(id) => setSelected([id], !selected.has(id))}
          onToggleSelectAll={setSelected}
          extraColumns={columns}
        />
      )}
      {isPMBA && (
        <RoadmapBulkBar count={selected.size} sprintNumber={v.working?.sprint_number} onSet={onBulk} onAssign={() => setBulkAssign(true)} onClear={() => setSel(new Set())} />
      )}
      {closed.dialog}
      <TicketDetailSheet open={!!openTicket} onOpenChange={(o) => !o && setOpenId(null)} ticket={openTicket} projectId={projectId} onChange={() => {}} />
      <BulkAssignDialog open={bulkAssign} onOpenChange={setBulkAssign} projectId={projectId} ticketIds={[...selected]} onSaved={() => {}} />
    </div>
  );
}
