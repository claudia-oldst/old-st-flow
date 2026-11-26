import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useAiTicketSearch } from "@/features/_shared/ai-search/useAiTicketSearch";
import type { Sprint } from "../types";
import type { RoadmapData } from "./useRoadmapData";
import { defaultWorkingSprint } from "./cellRules";
import { applySprintFilter, isSplit, type FilterCtx } from "./roadmapFilters";
import type { GroupBy } from "@/features/tickets/TicketsList";
import { EMPTY_FILTERS, applyFilters, type TicketFilters } from "@/features/tickets/TicketsFilter";

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

  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [sprintFilter, setSprintFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const ai = useAiTicketSearch();

  const ctx: FilterCtx = useMemo(() => ({
    working, previous, commitsByTicket: d.commitsByTicket, plannedByTicket: d.plannedByTicket, devDoneStatusIds: d.devDoneStatusIds,
  }), [working, previous, d.commitsByTicket, d.plannedByTicket, d.devDoneStatusIds]);

  const filtered = useMemo(() => applySprintFilter(applyFilters(d.tickets, filters), sprintFilter, ctx), [d.tickets, filters, sprintFilter, ctx]);
  const rows = useMemo(() => {
    if (ai.result) return filtered.filter((t) => ai.result!.ids.has(t.id));
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((t) => t.formatted_id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
  }, [filtered, search, ai.result]);

  const split = useCallback((t: TicketRow) => isSplit(t, ctx), [ctx]);

  return {
    sorted, working, previous, colSprints, colIds, groupBy, rows, filters, setFilters, sprintFilter, setSprintFilter, search, setSearch, ai,
    split, filtered,
    setWorking: (id: string) => setParam("ws", id),
    setGroupBy: (g: GroupBy) => setParam("group", g === "epic" ? null : g),
    setCols: (ids: string[] | null) => setParam("cols", ids ? ids.join(",") : null),
  };
}
