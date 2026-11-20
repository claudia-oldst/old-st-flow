import { useCallback, useMemo, useState } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { AssignDialog } from "@/features/tickets/AssignDialog";
import { BulkAssignDialog } from "@/features/tickets/BulkAssignDialog";
import type { Sprint, SprintDiscipline } from "../types";
import { useRoadmapData } from "./useRoadmapData";
import { useRoadmapView } from "./useRoadmapView";
import { useRoadmapMutations, type TicketPlan } from "./useRoadmapMutations";
import { useClosedSprintConfirm } from "./useClosedSprintConfirm";
import { isClosed, planCell, type CellState, type SprintLite } from "./cellRules";
import { WorkingSprintBar } from "./WorkingSprintBar";
import { RoadmapToolbar } from "./RoadmapToolbar";
import { RoadmapTable } from "./RoadmapTable";
import { RoadmapBulkBar, type BulkDisc } from "./RoadmapBulkBar";
import { assignLoad } from "./assignLoad";

const WORD: Record<CellState, string> = { none: "removed from", planned: "planned into", committed: "committed to" };
const hasHours = (t: TicketRow, d: SprintDiscipline) => t.ticket_type !== "Proj" && ((d === "FE" ? t.current_fe_estimate : t.current_be_estimate) || 0) > 0;

export function RoadmapView({ projectId, sprints, isPMBA }: { projectId: string; sprints: Sprint[]; isPMBA: boolean }) {
  const d = useRoadmapData(projectId, sprints);
  const v = useRoadmapView(projectId, sprints, d);
  const { apply } = useRoadmapMutations(projectId);
  const closed = useClosedSprintConfirm();
  const [selected, setSel] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<TicketRow | null>(null);
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
    const plans = v.rows.filter((t) => selected.has(t.id)).flatMap((t) => discs.filter((x) => hasHours(t, x)).map((x) => planFor(t, s, x, to)));
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
        onCollapseAll={(c) => setCollapsed(c ? new Set(v.groups.map((g) => g.key)) : new Set())}
      />
      {d.loading && <div className="text-[11px] text-dimmer">Loading more tickets…</div>}
      <RoadmapTable
        groups={v.groups} sprints={v.colSprints} workingId={v.working?.id} totals={d.totalsBySprint} caps={capsSimple}
        commitsByTicket={d.commitsByTicket} plannedByTicket={d.plannedByTicket} statusById={v.statusById} isSplit={v.split}
        selected={selected} setSelected={setSelected} collapsed={collapsed}
        toggleGroup={(k) => setCollapsed((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
        editable={isPMBA} onOpen={(t) => setOpenId(t.id)} onAssign={setAssignFor} onSet={onSet}
      />
      {isPMBA && (
        <RoadmapBulkBar count={selected.size} sprintNumber={v.working?.sprint_number} onSet={onBulk} onAssign={() => setBulkAssign(true)} onClear={() => setSel(new Set())} />
      )}
      {closed.dialog}
      <TicketDetailSheet open={!!openTicket} onOpenChange={(o) => !o && setOpenId(null)} ticket={openTicket} projectId={projectId} onChange={() => {}} />
      {assignFor && (
        <AssignDialog
          open onOpenChange={(o) => !o && setAssignFor(null)} ticketId={assignFor.id} projectId={projectId}
          ticketType={assignFor.ticket_type} current={assignFor.assignees.map((a) => ({ user_id: a.user_id, slot: a.slot }))}
          onSaved={() => {}}
          loadFor={v.working ? (userId, slot, sel) => assignLoad({
            ticket: assignFor, sprint: v.working!, closed: isClosed(v.working!, d.today), totals: d.totalsBySprint.get(v.working!.id),
            cap: d.capsBySprint.get(v.working!.id)?.byUser.get(userId)?.[slot] ?? 0, commits: d.commitsByTicket.get(assignFor.id) ?? [],
            plannedId: d.plannedByTicket.get(assignFor.id), userId, slot, selected: sel,
          }) : undefined}
        />
      )}
      <BulkAssignDialog open={bulkAssign} onOpenChange={setBulkAssign} projectId={projectId} ticketIds={[...selected]} onSaved={() => {}} />
    </div>
  );
}
