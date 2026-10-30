import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox } from "lucide-react";
import { TicketsList, type GroupBy } from "@/features/tickets/TicketsList";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { ProjectTicketsToolbar } from "@/features/tickets/project-tickets/ProjectTicketsToolbar";
import { EMPTY_FILTERS, type TicketFilters, type FilterSection } from "@/features/tickets/TicketsFilter";
import { useProjectTicketsPaged } from "@/features/tickets/useProjectTicketsPaged";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { ColKey } from "@/features/tickets/list/columns";
import { useProjectRole, canManageTickets } from "@/features/team/useProjectRole";
import { ListPagination } from "@/components/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/store/currentUser";
import { ConvertFeedbackDialog } from "./ConvertFeedbackDialog";
import { CopyTicketsDialog } from "@/features/tickets/CopyTicketsDialog";
import { ImportCsvDialog } from "@/features/tickets/project-tickets/ImportCsvDialog";
import { useTicketsCsvImport } from "@/features/tickets/project-tickets/useTicketsCsvImport";

const PAGE_SIZE = 100;
const SORT = { col: "created_at", dir: "desc" } as const;
const COLUMNS: ColKey[] = ["id", "title", "epic", "fe", "be"];
const GROUPS: GroupBy[] = ["none", "epic", "version"];
const FILTERS: FilterSection[] = ["epic", "version"];

/** Thalamus Feedback inbox: unconverted Feedback tickets, using the standard toolbar, list + detail sheet. */
export function ProjectFeedback({ projectId }: { projectId: string }) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const canManage = canManageTickets(role);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [initialTitles, setInitialTitles] = useState<string[] | undefined>();
  const [convert, setConvert] = useState<TicketRow | null>(null);
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("ticket"));
  const { rows, total, loading, reload } = useProjectTicketsPaged(projectId, {
    filters, search, sort: SORT, page, pageSize: PAGE_SIZE, feedback: true,
  });
  const csv = useTicketsCsvImport(projectId, rows, () => reload(), "Feedback");
  const open = useMemo<TicketRow | null>(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  useEffect(() => setPage(1), [filters, search]);
  useEffect(() => {
    if (!openId && params.has("ticket")) { params.delete("ticket"); setParams(params, { replace: true }); }
  }, [openId, params, setParams]);

  return (
    <div className="space-y-4">
      <ProjectTicketsToolbar
        projectId={projectId} tickets={rows} filters={filters} setFilters={setFilters}
        view="list" filterMine={false} groupBy={groupBy} setGroupBy={setGroupBy}
        search={search} setSearch={setSearch} role={role} user={user}
        onAdd={() => setAddOpen(true)} addLabel="Add feedback"
        onImport={() => setImportOpen(true)} onCopyTickets={() => setCopyOpen(true)}
        showViewToggle={false} showMineToggle={false} showGroupTimer={false}
        groupOptions={GROUPS} filterSections={FILTERS}
      />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : !rows.length ? (
        <div className="py-16 text-center text-dim text-sm">
          <Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" />
          No feedback waiting. Converted tickets appear in the Tickets tab.
        </div>
      ) : (
        <>
          <TicketsList
            tickets={rows} groupBy={groupBy} onOpen={(t) => setOpenId(t.id)}
            currentUserId={user?.id} projectId={projectId} columns={COLUMNS}
            rowAction={canManage ? (t) => (
              <Button size="sm" className="h-7" onClick={() => setConvert(t)}>Convert</Button>
            ) : undefined}
          />
          <ListPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
      <TicketDetailSheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)} ticket={open} projectId={projectId} onChange={reload} />
      {convert && (
        <ConvertFeedbackDialog open onOpenChange={(o) => !o && setConvert(null)} ticket={convert} onConverted={() => { setConvert(null); reload(); }} />
      )}
      <AddTicketsDialog
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setInitialTitles(undefined); }}
        projectId={projectId} onCreated={reload} defaultType="Feedback" lockType initialTitles={initialTitles}
      />
      <CopyTicketsDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        onParsed={(titles) => { setCopyOpen(false); setInitialTitles(titles); setAddOpen(true); }}
      />
      <ImportCsvDialog
        open={importOpen} onOpenChange={setImportOpen}
        rows={csv.rows} fileName={csv.fileName} dragOver={csv.dragOver} setDragOver={csv.setDragOver}
        importing={csv.importing} handleFile={csv.handleFile} reset={csv.reset}
        onImport={async () => { if (await csv.handleImport()) setImportOpen(false); }}
      />
    </div>
  );
}
