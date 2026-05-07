import { useState } from "react";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import { FileText } from "lucide-react";
import { StartGroupTimerDialog } from "@/features/timelog/StartGroupTimerDialog";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { TicketsList } from "@/features/tickets/TicketsList";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { useProjectRole } from "@/features/team/useProjectRole";
import { useTicketsCsvImport } from "./project-tickets/useTicketsCsvImport";
import { useProjectTicketsView } from "./project-tickets/useProjectTicketsView";
import { ProjectTicketsToolbar } from "./project-tickets/ProjectTicketsToolbar";
import { ImportCsvDialog } from "./project-tickets/ImportCsvDialog";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectTickets({ projectId }: { projectId: string }) {
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const { tickets, loading, reload } = useProjectTickets(projectId);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [groupTimerOpen, setGroupTimerOpen] = useState(false);
  const activeTimer = useTimerStore((s) => s.active);
  const { prefs: cardPrefs, setPrefs: setCardPrefs, reset: resetCardPrefs } = useCardDisplayPrefs();
  const csv = useTicketsCsvImport(projectId, tickets, reload);
  const { rows, fileName, dragOver, setDragOver, importing, handleFile, handleImport, reset: resetImport } = csv;

  const v = useProjectTicketsView({ tickets, user, role });

  const onImportClick = async () => {
    const ok = await handleImport();
    if (ok) setImportOpen(false);
  };

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
        search={v.search}
        setSearch={v.setSearch}
        role={role}
        user={user}
        activeTimer={activeTimer}
        onStartGroupTimer={() => setGroupTimerOpen(true)}
        onAdd={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
      />

      {v.view === "board" ? (
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
      ) : loading && tickets.length === 0 ? (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-none bg-white/[0.03]" />
          ))}
        </div>
      ) : v.visibleTickets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-dimmer mb-3" />
          <div className="font-medium">{v.filterMine ? "No tickets assigned to you" : "No tickets yet"}</div>
          <div className="text-dim text-sm mt-1">
            {v.filterMine ? "Switch to All to see every ticket on this project." : "Add tickets from the Board, or import a CSV."}
          </div>
        </div>
      ) : (
        <TicketsList
          tickets={v.visibleTickets}
          groupBy={v.groupBy}
          onOpen={setOpenTicket}
          selectedIds={v.selectedIds}
          onToggleSelect={v.toggleSelect}
          onToggleSelectAll={v.toggleSelectAll}
          showQuickStart={v.filterMine}
          currentUserId={user?.id}
        />
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
        onChange={reload}
      />
    </div>
  );
}
