import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTicketById } from "@/features/tickets/fetchTicketById";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { useProjectTicketsPaged, type ServerSort } from "@/features/tickets/useProjectTicketsPaged";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { useColumnDisplayPrefs } from "@/features/tickets/useColumnDisplayPrefs";
import { useProjectRole } from "@/features/team/useProjectRole";
import { useTicketsCsvImport } from "./useTicketsCsvImport";
import { useProjectTicketsView } from "./useProjectTicketsView";
import { PAGE_SIZES } from "@/lib/pagination";
import { useSprints } from "@/features/sprints/useSprintBoard";
import { usePoolData } from "@/features/sprints/usePoolData";

/**
 * All state, data loading and derived rows for the project Tickets tab.
 * The component consuming this stays purely presentational.
 */
export function useProjectTicketsPage(projectId: string) {
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const { tickets, loading, reload, error } = useProjectTickets(projectId);

  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [initialTitles, setInitialTitles] = useState<string[] | undefined>(undefined);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [groupTimerOpen, setGroupTimerOpen] = useState(false);
  const activeTimer = useTimerStore((s) => s.active);

  const cardDisplay = useCardDisplayPrefs();
  const columnDisplay = useColumnDisplayPrefs();
  const csv = useTicketsCsvImport(projectId, tickets, reload);

  const v = useProjectTicketsView({ tickets, user, role, projectId });
  const grouped = v.groupBy !== "none";

  // List-view server pagination (only when ungrouped — grouping needs the full set)
  const [page, setPage] = useState(1);
  const sort: ServerSort = useMemo(() => ({ col: "position", dir: "asc" }), []);
  const paged = useProjectTicketsPaged(v.view === "list" && !grouped ? projectId : undefined, {
    filters: v.filters,
    search: v.search,
    sort,
    page,
    pageSize: PAGE_SIZES.ticketsList,
    filterMineUserId: v.filterMine && user ? user.id : null,
  });

  // Reset to page 1 whenever filters/search/filterMine change
  const filterSig = useMemo(
    () => JSON.stringify({ f: v.filters, s: v.search, m: v.filterMine }),
    [v.filters, v.search, v.filterMine],
  );
  useEffect(() => setPage(1), [filterSig]);

  // Deep link: /projects/:id?ticket=<uuid> opens that ticket's detail sheet.
  const [searchParams, setSearchParams] = useSearchParams();
  const deepTicketId = searchParams.get("ticket");
  useEffect(() => {
    if (!deepTicketId) return;
    let cancelled = false;
    (async () => {
      const t = await fetchTicketById(deepTicketId);
      if (!cancelled && t) setOpenTicket(t);
      if (!cancelled) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("ticket");
            return next;
          },
          { replace: true },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deepTicketId, setSearchParams]);

  const onImportClick = async () => {
    const ok = await csv.handleImport();
    if (ok) setImportOpen(false);
  };

  const { data: sprints = [] } = useSprints(v.view === "list" ? projectId : undefined);
  const poolData = usePoolData(v.view === "list" ? projectId : undefined, sprints);

  const [fePlannedFilter, setFePlannedFilter] = useState<string[]>([]);
  const [feCommittedFilter, setFeCommittedFilter] = useState<number[]>([]);
  const [bePlannedFilter, setBePlannedFilter] = useState<string[]>([]);
  const [beCommittedFilter, setBeCommittedFilter] = useState<number[]>([]);

  const sourceRows = grouped ? v.visibleTickets : paged.rows;
  const listVisible = useMemo(() => {
    let rows = sourceRows;
    if (fePlannedFilter.length > 0) {
      rows = rows.filter((t) => {
        const fe = poolData.byTicket.get(t.id)?.fe ?? null;
        return fe ? fePlannedFilter.includes(fe) : false;
      });
    }
    if (feCommittedFilter.length > 0) {
      rows = rows.filter((t) => {
        const active = poolData.activeByTicket.get(t.id)?.fe ?? [];
        return active.some((n) => feCommittedFilter.includes(n));
      });
    }
    if (bePlannedFilter.length > 0) {
      rows = rows.filter((t) => {
        const be = poolData.byTicket.get(t.id)?.be ?? null;
        return be ? bePlannedFilter.includes(be) : false;
      });
    }
    if (beCommittedFilter.length > 0) {
      rows = rows.filter((t) => {
        const active = poolData.activeByTicket.get(t.id)?.be ?? [];
        return active.some((n) => beCommittedFilter.includes(n));
      });
    }
    return rows;
  }, [sourceRows, poolData, fePlannedFilter, feCommittedFilter, bePlannedFilter, beCommittedFilter]);

  const listLoading =
    v.view === "list" &&
    (grouped ? loading && tickets.length === 0 : paged.loading && listVisible.length === 0);

  return {
    role,
    user,
    tickets,
    loading,
    reload,
    error,
    v,
    grouped,
    page,
    setPage,
    paged,
    csv,
    onImportClick,
    sprints,
    poolData,
    listVisible,
    listLoading,
    activeTimer,
    cardDisplay,
    columnDisplay,
    importOpen,
    setImportOpen,
    addOpen,
    setAddOpen,
    copyOpen,
    setCopyOpen,
    initialTitles,
    setInitialTitles,
    openTicket,
    setOpenTicket,
    groupTimerOpen,
    setGroupTimerOpen,
    sprintFilters: {
      fePlannedFilter,
      setFePlannedFilter,
      feCommittedFilter,
      setFeCommittedFilter,
      bePlannedFilter,
      setBePlannedFilter,
      beCommittedFilter,
      setBeCommittedFilter,
    },
  };
}
