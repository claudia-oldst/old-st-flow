import { useMemo } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { applyFilters, type TicketFilters } from "@/features/tickets/TicketsFilter";

/**
 * Flattened list of assigned tickets plus the search/filter-narrowed view
 * used by the developer columns in sprint planning.
 */
export function useDevColumnFilters(
  devAssignments: Map<string, TicketRow[]>,
  devFilters: TicketFilters,
  devSearch: string,
) {
  const allAssignedTickets = useMemo(() => {
    const seen = new Set<string>();
    const out: TicketRow[] = [];
    devAssignments.forEach((list) => {
      list.forEach((t) => {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          out.push(t);
        }
      });
    });
    return out;
  }, [devAssignments]);

  const visibleAssignmentsByDev = useMemo(() => {
    const q = devSearch.trim().toLowerCase();
    const out = new Map<string, TicketRow[]>();
    devAssignments.forEach((list, userId) => {
      let filtered = applyFilters(list, devFilters);
      if (q) {
        filtered = filtered.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.formatted_id ?? "").toLowerCase().includes(q),
        );
      }
      out.set(userId, filtered);
    });
    return out;
  }, [devAssignments, devFilters, devSearch]);

  const visibleCount = useMemo(() => {
    const s = new Set<string>();
    visibleAssignmentsByDev.forEach((list) => list.forEach((t) => s.add(t.id)));
    return s.size;
  }, [visibleAssignmentsByDev]);

  return { allAssignedTickets, visibleAssignmentsByDev, visibleCount };
}
