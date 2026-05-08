import { useEffect, useMemo, useState } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import {
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import type { GroupBy } from "@/features/tickets/TicketsList";
import type { ProjectRole } from "@/lib/types";
import { canManageTickets } from "@/features/team/useProjectRole";

type ViewMode = "board" | "list";

export function useProjectTicketsView({
  tickets,
  user,
  role,
}: {
  tickets: TicketRow[];
  user: { id: string } | null;
  role: ProjectRole | null;
}) {
  const pmba = isPMBA(role);
  const [view, setView] = useState<ViewMode>("board");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [filterMine, setFilterMine] = useState<boolean>(true);
  const [touched, setTouched] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (touched || role === null) return;
    setFilterMine(!pmba);
  }, [role, pmba, touched]);

  const filteredTickets = useMemo(() => applyFilters(tickets, filters), [tickets, filters]);

  const visibleTickets = useMemo(() => {
    let out = filteredTickets;
    if (filterMine && user) {
      out = out.filter((t) => t.assignees.some((a) => a.user_id === user.id));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.formatted_id ?? "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [filteredTickets, filterMine, user, search]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleSet = new Set(visibleTickets.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => visibleSet.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleTickets]);

  useEffect(() => {
    if (view !== "list") {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    }
  }, [view]);

  const toggleSelect = (id: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId && lastSelectedId !== id) {
        const ids = visibleTickets.map((t) => t.id);
        const a = ids.indexOf(lastSelectedId);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [from, to] = a < b ? [a, b] : [b, a];
          const shouldSelect = !prev.has(id);
          for (let i = from; i <= to; i++) {
            if (shouldSelect) next.add(ids[i]);
            else next.delete(ids[i]);
          }
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastSelectedId(id);
  };

  const toggleSelectAll = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  return {
    view, setView,
    groupBy, setGroupBy,
    filterMine, setFilterMine,
    touched, setTouched,
    filters, setFilters,
    search, setSearch,
    selectedIds, toggleSelect, toggleSelectAll, clearSelection,
    filteredTickets, visibleTickets,
    pmba,
  };
}
