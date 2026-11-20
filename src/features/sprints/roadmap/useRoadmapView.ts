import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { useAiTicketSearch } from "@/features/_shared/ai-search/useAiTicketSearch";
import type { Sprint } from "../types";
import type { RoadmapData } from "./useRoadmapData";
import { defaultWorkingSprint } from "./cellRules";
import { applyFilters, emptyFilters, isSplit, type FilterCtx, type RoadmapFilters } from "./roadmapFilters";
import type { GroupBy } from "./roadmapGroups";

/** Working sprint, sprint columns and grouping (in the URL), filters and the grouped rows. */
export function useRoadmapView(projectId: string, sprints: Sprint[], d: RoadmapData) {
  const [params, setParams] = useSearchParams();
  const sorted = useMemo(() => [...sprints].sort((a, b) => a.start_date.localeCompare(b.start_date)), [sprints]);
  const working = sorted.find((s) => s.id === params.get("ws")) ?? defaultWorkingSprint(sorted, d.today);
  const wIdx = working ? sorted.indexOf(working) : -1;
  const previous = wIdx > 0 ? sorted[wIdx - 1] : undefined;
  const groupBy = (params.get("group") as GroupBy) || "epic";

  const setParam = useCallback((k: string, v: string | null) => {
    setParams((p) => { const n = new URLSearchParams(p); if (v === null) n.delete(k); else n.set(k, v); return n; }, { replace: true });
  }, [setParams]);

  const colIds = useMemo(() => {
    const raw = params.get("cols");
    const base = raw ? raw.split(",") : [previous?.id, working?.id].filter(Boolean) as string[];
    if (working && !base.includes(working.id)) base.push(working.id);
    return sorted.filter((s) => base.includes(s.id)).map((s) => s.id);
  }, [params, previous, working, sorted]);
  const colSprints = sorted.filter((s) => colIds.includes(s.id));

  const [filters, setFilters] = useState<RoadmapFilters>(emptyFilters);
  const [search, setSearch] = useState("");
  const ai = useAiTicketSearch();
  const { epics } = useProjectEpics(projectId);

  const ctx: FilterCtx = useMemo(() => ({
    working, previous, commitsByTicket: d.commitsByTicket, plannedByTicket: d.plannedByTicket, devDoneStatusIds: d.devDoneStatusIds,
  }), [working, previous, d.commitsByTicket, d.plannedByTicket, d.devDoneStatusIds]);

  const filtered = useMemo(() => applyFilters(d.tickets, filters, ctx), [d.tickets, filters, ctx]);
  const rows = useMemo(() => {
    if (ai.result) return filtered.filter((t) => ai.result!.ids.has(t.id));
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((t) => t.formatted_id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
  }, [filtered, search, ai.result]);

  const statusById = useMemo(() => new Map(d.statuses.map((s) => [s.id, { name: s.name, color: s.color }])), [d.statuses]);
  const memberName = useMemo(() => {
    const m = new Map<string, string>();
    d.tickets.forEach((t) => t.assignees.forEach((a) => m.set(a.user_id, a.member.name)));
    return m;
  }, [d.tickets]);

  const options = useMemo(() => ({
    epics: [...epics.map((e) => ({ value: String(e.id), label: e.epic_name ?? "Untitled epic" })), { value: "none", label: "No epic" }],
    types: ["Standard", "Bug", "CR", "Proj"].map((v) => ({ value: v, label: v })),
    statuses: d.statuses.map((s) => ({ value: s.id, label: s.name })),
    assignees: [{ value: "unassigned", label: "Unassigned" }, ...[...memberName].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))],
  }), [epics, d.statuses, memberName]);

  const split = useCallback((t: TicketRow) => isSplit(t, ctx), [ctx]);

  return {
    sorted, working, previous, colSprints, colIds, groupBy, rows, filters, setFilters, search, setSearch, ai,
    options, statusById, split, filtered,
    setWorking: (id: string) => setParam("ws", id),
    setGroupBy: (g: GroupBy) => setParam("group", g === "epic" ? null : g),
    setCols: (ids: string[] | null) => setParam("cols", ids ? ids.join(",") : null),
  };
}
