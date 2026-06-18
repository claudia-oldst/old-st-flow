import { useCallback, useEffect, useMemo, useState } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { ColKey, DISC_ORDER, SORTABLE, SORT_STORAGE_KEY, SortState, loadSort } from "./columns";
import type { Status } from "@/lib/types";
import type { PoolData } from "./poolData";

export function useTicketsSort(statuses: Status[], poolData?: PoolData) {

  const [sort, setSort] = useState<SortState | null>(() => loadSort());

  useEffect(() => {
    try {
      if (sort) localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
      else localStorage.removeItem(SORT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [sort]);

  const toggleSort = useCallback((key: ColKey) => {
    if (!SORTABLE[key]) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const statusOrder = useMemo(() => {
    const m = new Map<string, number>();
    statuses.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [statuses]);

  const sortTickets = useCallback(
    (arr: TicketRow[]): TicketRow[] => {
      if (!sort) return arr;
      const dir = sort.dir === "asc" ? 1 : -1;
      const cmpStr = (a: string, b: string) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      const valFor = (t: TicketRow): string | number => {
        switch (sort.key) {
          case "id":
            return t.formatted_id ?? "";
          case "title":
            return (t.title ?? "").toLowerCase();
          case "epic":
            return (t.epic_name ?? "").toLowerCase();
          case "version":
            return t.version ?? "";
          case "status":
            return statusOrder.get(t.status_id ?? "") ?? Number.MAX_SAFE_INTEGER;
          case "dev_status": {
            const hasFE = t.assignees.some((a) => a.slot === "FE");
            const hasBE = t.assignees.some((a) => a.slot === "BE");
            const fe = hasFE ? DISC_ORDER[t.fe_status] : 99;
            const be = hasBE ? DISC_ORDER[t.be_status] : 99;
            return fe * 100 + be;
          }
          case "fe":
            return Number(t.actual_frontend_hours ?? 0);
          case "be":
            return Number(t.actual_backend_hours ?? 0);
          case "assignees":
            return (t.assignees[0]?.member.name ?? "~").toLowerCase();
          case "fe_pool": {
            const active = poolData?.activeByTicket.get(t.id)?.fe ?? [];
            if (active.length > 0) return Math.min(...active);
            const sid = poolData?.byTicket.get(t.id)?.fe ?? null;
            const n = sid ? poolData?.sprintsById.get(sid)?.sprint_number : undefined;
            return n ?? Number.MAX_SAFE_INTEGER;
          }
          case "be_pool": {
            const active = poolData?.activeByTicket.get(t.id)?.be ?? [];
            if (active.length > 0) return Math.min(...active);
            const sid = poolData?.byTicket.get(t.id)?.be ?? null;
            const n = sid ? poolData?.sprintsById.get(sid)?.sprint_number : undefined;
            return n ?? Number.MAX_SAFE_INTEGER;
          }
        }
      };
      return [...arr].sort((a, b) => {
        const va = valFor(a);
        const vb = valFor(b);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return cmpStr(String(va), String(vb)) * dir;
      });
    },
    [sort, statusOrder, poolData]
  );


  return { sort, toggleSort, sortTickets };
}
