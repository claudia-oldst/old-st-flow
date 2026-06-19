import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { StartGroupTimerDialog } from "@/features/timelog/StartGroupTimerDialog";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { useProjectTicketsPaged, type ServerSort } from "@/features/tickets/useProjectTicketsPaged";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { TicketsList } from "@/features/tickets/TicketsList";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { useColumnDisplayPrefs } from "@/features/tickets/useColumnDisplayPrefs";
import { useProjectRole } from "@/features/team/useProjectRole";
import { useTicketsCsvImport } from "./project-tickets/useTicketsCsvImport";
import { useProjectTicketsView } from "./project-tickets/useProjectTicketsView";
import { ProjectTicketsToolbar } from "./project-tickets/ProjectTicketsToolbar";
import { ImportCsvDialog } from "./project-tickets/ImportCsvDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/ListPagination";
import { PAGE_SIZES } from "@/lib/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSprints } from "@/features/sprints/useSprintBoard";
import { usePoolData } from "@/features/sprints/usePoolData";
import { SprintPoolFilter } from "@/features/sprints/SprintPoolFilter";

export function ProjectTickets({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const { tickets, loading, reload, error } = useProjectTickets(projectId);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [groupTimerOpen, setGroupTimerOpen] = useState(false);
  const activeTimer = useTimerStore((s) => s.active);
  const { prefs: cardPrefs, setPrefs: setCardPrefs, reset: resetCardPrefs } = useCardDisplayPrefs();
  const { prefs: columnPrefs, setPrefs: setColumnPrefs, reset: resetColumnPrefs } = useColumnDisplayPrefs();
  const csv = useTicketsCsvImport(projectId, tickets, reload);
  const { rows, fileName, dragOver, setDragOver, importing, handleFile, handleImport, reset: resetImport } = csv;

  const v = useProjectTicketsView({ tickets, user, role, projectId });

  // List-view server pagination
  const [page, setPage] = useState(1);
  const sort: ServerSort = useMemo(() => ({ col: "position", dir: "asc" }), []);
  const paged = useProjectTicketsPaged(v.view === "list" ? projectId : undefined, {
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

  const onImportClick = async () => {
    const ok = await handleImport();
    if (ok) setImportOpen(false);
  };

  const { data: sprints = [] } = useSprints(v.view === "list" ? projectId : undefined);
  const poolData = usePoolData(v.view === "list" ? projectId : undefined, sprints);

  const [fePlannedFilter, setFePlannedFilter] = useState<string[]>([]);
  const [feCommittedFilter, setFeCommittedFilter] = useState<number[]>([]);
  const [bePlannedFilter, setBePlannedFilter] = useState<string[]>([]);
  const [beCommittedFilter, setBeCommittedFilter] = useState<number[]>([]);

  const listVisible = useMemo(() => {
    let rows = paged.rows;
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
  }, [paged.rows, poolData, fePlannedFilter, feCommittedFilter, bePlannedFilter, beCommittedFilter]);
  const listLoading = v.view === "list" && paged.loading && listVisible.length === 0;

  return (
    <div>
      <ProjectTicketsToolbar
        projectId={projectId}
        tickets={tickets}
        filters={v.filters}
        setFilters={v.setFilters}
        view={v.view}
        setView={v.setView}
        filterMine={v.filterMine}
        setFilterMine={v.setFilterMine}
        setTouched={v.setTouched}
        groupBy={v.groupBy}
        setGroupBy={v.setGroupBy}
        cardPrefs={cardPrefs}
        setCardPrefs={setCardPrefs}
        resetCardPrefs={resetCardPrefs}
        columnPrefs={columnPrefs}
        setColumnPrefs={setColumnPrefs}
        resetColumnPrefs={resetColumnPrefs}
        search={v.search}
        setSearch={v.setSearch}
        role={role}
        user={user}
        activeTimer={activeTimer}
        onStartGroupTimer={() => setGroupTimerOpen(true)}
        onAdd={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
        extras={
          v.view === "list" ? (
            <>
              <SprintPoolFilter
                label="FE Sprint"
                sprints={sprints}
                plannedSelected={fePlannedFilter}
                committedSelected={feCommittedFilter}
                onPlannedChange={setFePlannedFilter}
                onCommittedChange={setFeCommittedFilter}
              />
              <SprintPoolFilter
                label="BE Sprint"
                sprints={sprints}
                plannedSelected={bePlannedFilter}
                committedSelected={beCommittedFilter}
                onPlannedChange={setBePlannedFilter}
                onCommittedChange={setBeCommittedFilter}
              />
            </>
          ) : undefined
        }
      />

      {error ? (
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tickets could not load</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading && tickets.length === 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[260px] space-y-2">
              <Skeleton className="h-8 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ))}
        </div>
      ) : v.view === "board" ? (
        <ProjectBoard
          projectId={projectId}
          search={v.search}
          filterMine={v.filterMine}
          onFilterMineChange={(val) => {
            v.setTouched(true);
            v.setFilterMine(val);
          }}
          tickets={v.filteredTickets}
          reload={reload}
        />
      ) : paged.error ? (
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ticket list could not load</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{paged.error}</span>
            <Button type="button" variant="outline" size="sm" onClick={paged.reload}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : listLoading ? (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-none bg-white/[0.03]" />
          ))}
        </div>
      ) : listVisible.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-dimmer mb-3" />
          <div className="font-medium">{v.filterMine ? "No tickets assigned to you" : "No tickets yet"}</div>
          <div className="text-dim text-sm mt-1">
            {v.filterMine ? "Switch to All to see every ticket on this project." : "Add tickets from the Board, or import a CSV."}
          </div>
        </div>
      ) : (
        <>
          <TicketsList
            tickets={listVisible}
            groupBy={v.groupBy}
            onOpen={setOpenTicket}
            selectedIds={v.selectedIds}
            onToggleSelect={v.toggleSelect}
            onToggleSelectAll={v.toggleSelectAll}
            showQuickStart={v.filterMine}
            currentUserId={user?.id}
            extraCols={["fe_pool", "be_pool"]}
            poolData={poolData}
            columnPrefs={columnPrefs}
          />
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-dimmer">
              Showing {(page - 1) * PAGE_SIZES.ticketsList + 1}–
              {Math.min(page * PAGE_SIZES.ticketsList, paged.total)} of {paged.total}
            </div>
            <ListPagination
              page={page}
              total={paged.total}
              pageSize={PAGE_SIZES.ticketsList}
              onChange={setPage}
            />
          </div>
        </>
      )}

      {v.view === "list" && (
        <BulkActionsBar
          projectId={projectId}
          selectedIds={Array.from(v.selectedIds)}
          onClear={v.clearSelection}
          canEdit={v.pmba}
        />
      )}

      <StartGroupTimerDialog
        open={groupTimerOpen}
        onOpenChange={setGroupTimerOpen}
        tickets={tickets}
        role={role}
      />

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        rows={rows}
        fileName={fileName}
        dragOver={dragOver}
        setDragOver={setDragOver}
        importing={importing}
        handleFile={handleFile}
        reset={resetImport}
        onImport={onImportClick}
      />

      <AddTicketsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onCreated={reload}
      />

      <TicketDetailSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        ticket={openTicket}
        projectId={projectId}
        onChange={() => {
          reload();
          paged.reload();
        }}
      />
    </div>
  );
}
