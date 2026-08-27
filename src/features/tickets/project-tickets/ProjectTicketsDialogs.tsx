import { StartGroupTimerDialog } from "@/features/timelog/StartGroupTimerDialog";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { CopyTicketsDialog } from "@/features/tickets/CopyTicketsDialog";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { ImportCsvDialog } from "./ImportCsvDialog";
import type { useProjectTicketsPage } from "./useProjectTicketsPage";

/** All modals/sheets owned by the Project Tickets page. */
export function ProjectTicketsDialogs({
  projectId,
  p,
}: {
  projectId: string;
  p: ReturnType<typeof useProjectTicketsPage>;
}) {
  const { csv, tickets, role, reload, paged } = p;
  return (
    <>
      <StartGroupTimerDialog
        open={p.groupTimerOpen}
        onOpenChange={p.setGroupTimerOpen}
        tickets={tickets}
        role={role}
      />

      <ImportCsvDialog
        open={p.importOpen}
        onOpenChange={p.setImportOpen}
        rows={csv.rows}
        fileName={csv.fileName}
        dragOver={csv.dragOver}
        setDragOver={csv.setDragOver}
        importing={csv.importing}
        handleFile={csv.handleFile}
        reset={csv.reset}
        onImport={p.onImportClick}
      />

      <CopyTicketsDialog
        open={p.copyOpen}
        onOpenChange={p.setCopyOpen}
        onParsed={(titles) => {
          p.setCopyOpen(false);
          p.setInitialTitles(titles);
          p.setAddOpen(true);
        }}
      />

      <AddTicketsDialog
        open={p.addOpen}
        onOpenChange={(o) => {
          p.setAddOpen(o);
          if (!o) p.setInitialTitles(undefined);
        }}
        projectId={projectId}
        onCreated={reload}
        initialTitles={p.initialTitles}
      />

      <TicketDetailSheet
        open={!!p.openTicket}
        onOpenChange={(o) => !o && p.setOpenTicket(null)}
        ticket={p.openTicket}
        projectId={projectId}
        onChange={() => {
          reload();
          paged.reload();
        }}
      />
    </>
  );
}
