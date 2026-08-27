import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { StartGroupTimerDialog } from "@/features/timelog/StartGroupTimerDialog";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { CopyTicketsDialog } from "@/features/tickets/CopyTicketsDialog";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { TicketsList } from "@/features/tickets/TicketsList";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { ProjectTicketsToolbar } from "./project-tickets/ProjectTicketsToolbar";
import { ImportCsvDialog } from "./project-tickets/ImportCsvDialog";
import { useProjectTicketsPage } from "./project-tickets/useProjectTicketsPage";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/ListPagination";
import { PAGE_SIZES } from "@/lib/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SprintPoolFilter } from "@/features/sprints/SprintPoolFilter";

export function ProjectTickets({ projectId }: { projectId: string }) {
  const p = useProjectTicketsPage(projectId);
  const {
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
    sprints,
    poolData,
    listVisible,
    listLoading,
    sprintFilters: sf,
  } = p;
  const { prefs: cardPrefs, setPrefs: setCardPrefs, reset: resetCardPrefs } = p.cardDisplay;
  const {
    prefs: columnPrefs,
    setPrefs: setColumnPrefs,
    reset: resetColumnPrefs,
  } = p.columnDisplay;

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
        activeTimer={p.activeTimer}
        onStartGroupTimer={() => p.setGroupTimerOpen(true)}
        onAdd={() => p.setAddOpen(true)}
        onImport={() => p.setImportOpen(true)}
        onCopyTickets={() => p.setCopyOpen(true)}
        extras={
          v.view === "list" ? (
            <>
              <SprintPoolFilter
                label="FE Sprint"
                sprints={sprints}
                plannedSelected={sf.fePlannedFilter}
                committedSelected={sf.feCommittedFilter}
                onPlannedChange={sf.setFePlannedFilter}
                onCommittedChange={sf.setFeCommittedFilter}
              />
              <SprintPoolFilter
                label="BE Sprint"
                sprints={sprints}
                plannedSelected={sf.bePlannedFilter}
                committedSelected={sf.beCommittedFilter}
                onPlannedChange={sf.setBePlannedFilter}
                onCommittedChange={sf.setBeCommittedFilter}
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
          <div className="font-medium">
            {v.filterMine ? "No tickets assigned to you" : "No tickets yet"}
          </div>
          <div className="text-dim text-sm mt-1">
            {v.filterMine
              ? "Switch to All to see every ticket on this project."
              : "Add tickets from the Board, or import a CSV."}
          </div>
        </div>
      ) : (
        <>
          <TicketsList
            tickets={listVisible}
            groupBy={v.groupBy}
            onOpen={p.setOpenTicket}
            selectedIds={v.selectedIds}
            onToggleSelect={v.toggleSelect}
            onToggleSelectAll={v.toggleSelectAll}
            showQuickStart={v.filterMine}
            currentUserId={user?.id}
            extraCols={["fe_pool", "be_pool"]}
            poolData={poolData}
            columnPrefs={columnPrefs}
            canEditEpics={v.pmba}
            projectId={projectId}
          />
          {!grouped && (
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
          )}
        </>
      )}

      {v.view === "list" && (
        <BulkActionsBar
          projectId={projectId}
          selectedIds={Array.from(v.selectedIds)}
          onClear={v.clearSelection}
          canEdit={v.pmba}
          canEditStatus={!!role}
        />
      )}

      <ProjectTicketsDialogs projectId={projectId} p={p} />

    </div>
  );
}
