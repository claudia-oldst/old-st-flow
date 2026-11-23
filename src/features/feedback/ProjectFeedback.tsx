import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox } from "lucide-react";
import { TicketsList, type GroupBy } from "@/features/tickets/TicketsList";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { useColumnDisplayPrefs } from "@/features/tickets/useColumnDisplayPrefs";
import { useAiTicketSearch } from "@/features/_shared/ai-search/useAiTicketSearch";
import { requestTicketPage } from "@/features/tickets/ticketPageRequest";
import { normalizeTicket } from "@/features/tickets/useProjectTickets";
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
import { usePersistentState } from "@/hooks/usePersistentState";
import { ProjectBoard } from "@/features/board/ProjectBoard";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { ConvertFeedbackDialog } from "./ConvertFeedbackDialog";
import { CopyTicketsDialog } from "@/features/tickets/CopyTicketsDialog";
import { ImportCsvDialog } from "@/features/tickets/project-tickets/ImportCsvDialog";
import { useTicketsCsvImport } from "@/features/tickets/project-tickets/useTicketsCsvImport";

const PAGE_SIZE = 100;
const SORT = { col: "created_at", dir: "desc" } as const;
const COLUMNS: ColKey[] = ["id", "title", "status", "assignees", "epic", "version", "fe", "be"];
const COLUMN_OPTIONS: ColKey[] = [...COLUMNS, "created_at", "updated_at"];
const GROUPS: GroupBy[] = ["none", "status", "epic", "version"];
const FILTERS: FilterSection[] = ["status", "epic", "version", "acceptance"];

/** Thalamus Feedback inbox: unconverted Feedback tickets, using the standard toolbar, list + detail sheet. */
export function ProjectFeedback({ projectId }: { projectId: string }) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const canManage = canManageTickets(role);
  const [page, setPage] = useState(1);
  const [view, setView] = usePersistentState<"board" | "list">(`pf:${projectId}:view`, "list");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [initialTitles, setInitialTitles] = useState<string[] | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastId, setLastId] = useState<string | null>(null);
  const [convert, setConvert] = useState<TicketRow[] | null>(null);
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("ticket"));
  const { rows: pagedRows, total: pagedTotal, loading, reload } = useProjectTicketsPaged(projectId, {
    filters, search, sort: SORT,
    page: view === "board" ? 1 : page,
    pageSize: view === "board" ? 1000 : PAGE_SIZE,
    feedback: true,
  });
  const ai = useAiTicketSearch();
  const [aiPool, setAiPool] = useState<TicketRow[]>([]);
  useEffect(() => { ai.clear(); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const getAiCandidates = async () => {
    const data = await requestTicketPage({
      _project_id: projectId, _filters: { ...filters, filterMineUserId: null, feedback: true } as any,
      _search: null, _sort_col: SORT.col, _sort_dir: SORT.dir, _page: 1, _page_size: 1000,
    });
    const list = (((data as any)?.rows ?? []) as any[]).map(normalizeTicket);
    setAiPool(list);
    return list;
  };
  const rows = ai.result ? aiPool.filter((r) => ai.result!.ids.has(r.id)) : pagedRows;
  const total = ai.result ? rows.length : pagedTotal;
  const csv = useTicketsCsvImport(projectId, rows, () => reload(), "Feedback");
  const open = useMemo<TicketRow | null>(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  useEffect(() => setPage(1), [filters, search]);
  useEffect(() => {
    if (view !== "list") { setSelectedIds(new Set()); setLastId(null); }
  }, [view]);
  const toggleSelect = (id: string, shift: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = rows.map((r) => r.id);
      const a = lastId ? ids.indexOf(lastId) : -1, b = ids.indexOf(id);
      if (shift && a !== -1 && b !== -1 && a !== b) {
        const sel = !prev.has(id);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) sel ? next.add(ids[i]) : next.delete(ids[i]);
        return next;
      }
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setLastId(id);
  };
  const toggleSelectAll = (ids: string[], select: boolean) =>
    setSelectedIds((prev) => { const n = new Set(prev); ids.forEach((i) => (select ? n.add(i) : n.delete(i))); return n; });
  const colDisplay = useColumnDisplayPrefs();
  const clearSelection = () => { setSelectedIds(new Set()); setLastId(null); reload(); };
  useEffect(() => {
    if (!openId && params.has("ticket")) { params.delete("ticket"); setParams(params, { replace: true }); }
  }, [openId, params, setParams]);

  return (
    <div className="space-y-4">
      <ProjectTicketsToolbar
        projectId={projectId} tickets={rows} filters={filters} setFilters={setFilters}
        view={view} setView={setView} filterMine={false} groupBy={groupBy} setGroupBy={setGroupBy}
        search={search} setSearch={setSearch} role={role} user={user}
        ai={ai} getAiCandidates={getAiCandidates}
        onAdd={() => setAddOpen(true)} addLabel="Add feedback"
        onImport={() => setImportOpen(true)} onCopyTickets={() => setCopyOpen(true)}
        showMineToggle={false} showGroupTimer={false}
        groupOptions={GROUPS} filterSections={FILTERS}
        columnPrefs={colDisplay.prefs} setColumnPrefs={colDisplay.setPrefs} resetColumnPrefs={colDisplay.reset} columnOptions={COLUMN_OPTIONS}
      />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : view === "board" ? (
        <ProjectBoard
          feedback
          projectId={projectId}
          search={ai.result ? "" : search}
          filterMine={false}
          tickets={rows}
          reload={reload}
        />
      ) : !rows.length ? (
        <div className="py-16 text-center text-dim text-sm">
          <Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" />
          No feedback waiting. Converted tickets appear in the Tickets tab.
        </div>
      ) : (
        <>
          <TicketsList
            tickets={rows} groupBy={groupBy} onOpen={(t) => setOpenId(t.id)}
            currentUserId={user?.id} projectId={projectId} columns={COLUMNS} columnPrefs={colDisplay.prefs}
            selectedIds={canManage ? selectedIds : undefined}
            onToggleSelect={canManage ? toggleSelect : undefined}
            onToggleSelectAll={canManage ? toggleSelectAll : undefined}
            canEditEpics={canManage}
            rowAction={canManage ? (t) => (
              <Button size="sm" className="h-7" onClick={() => setConvert([t])}>Convert</Button>
            ) : undefined}
          />
          <ListPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
      {canManage && view === "list" && (
        <BulkActionsBar projectId={projectId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} canEdit feedback
          onConvert={() => setConvert(rows.filter((r) => selectedIds.has(r.id)))} />
      )}
      <TicketDetailSheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)} ticket={open} projectId={projectId} onChange={reload} />
      {convert && (
        <ConvertFeedbackDialog open onOpenChange={(o) => !o && setConvert(null)} tickets={convert} onConverted={() => { setSelectedIds(new Set()); reload(); }} />
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
