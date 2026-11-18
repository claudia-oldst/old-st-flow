import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import {
  useAllEstimateChanges,
  type ChangeRow,
} from "@/features/estimates/useAllEstimateChanges";
import { MultiSelectFilter } from "@/features/_shared/filters/MultiSelectFilter";
import { EpicChangeCard } from "@/features/estimates/EpicChangeCard";
import { DateRangeControl, defaultRange, type DateRange } from "@/features/_shared/DateRangeControl";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { ListPagination } from "@/components/ListPagination";
import { PAGE_SIZES } from "@/lib/pagination";
import { buildChangeRequestGroups } from "./project-change-requests/buildChangeRequestGroups";
import { useChangeDecisions } from "./project-change-requests/useChangeDecisions";

import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { discountTotalsByEpic, sumTotals } from "@/features/discounts/applyDiscounts";
import { RejectEstimateRevisionDialog } from "@/features/estimates/RejectEstimateRevisionDialog";
import { ReviewListToolbar } from "@/features/_shared/review-list/ReviewListToolbar";
import { useHiddenColumns, hiddenPositions } from "@/features/_shared/review-list/useHiddenColumns";
import {
  DEFAULT_REVIEW_GROUP, DEFAULT_REVIEW_STATUS, groupReviewItems, matchesSearch, sortReviewItems,
  type ReviewGroupBy, type ReviewSort,
} from "@/features/_shared/review-list/reviewList";
import { CHANGE_COLUMNS } from "@/features/estimates/EpicChangeCard";

const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "ticket", label: "Ticket ID" },
  { value: "hours", label: "Largest change" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function ProjectChangeRequests({ projectId }: { projectId: string }) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const canReview = isPMBA(role);
  const { changes, projects, epics, loading, reload } = useAllEstimateChanges(projectId);
  const { discounts } = useEpicDiscounts(projectId);
  const discountByEpic = useMemo(() => discountTotalsByEpic(discounts), [discounts]);

  const [statusFilter, setStatusFilter] = useState<string[]>(DEFAULT_REVIEW_STATUS);
  const [requesterFilter, setRequesterFilter] = useState<string[] | null>(null);
  const [range, setRange] = useState<DateRange>(() => defaultRange());
  const [rangeInitialized, setRangeInitialized] = useState(false);
  const [groupBy, setGroupBy] = useState<ReviewGroupBy>(DEFAULT_REVIEW_GROUP);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [search, setSearch] = useState("");
  const [hiddenCols, setHiddenCols] = useHiddenColumns("pulse:estimate-revisions:hidden-cols");
  const hiddenPos = hiddenPositions(CHANGE_COLUMNS, hiddenCols);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const { tickets: projectTickets, reload: reloadTickets } = useProjectTickets(projectId);
  const openTicket = useMemo(
    () => projectTickets.find((t) => t.id === openTicketId) ?? null,
    [projectTickets, openTicketId],
  );

  // Default the range to start at the project's start_date the first time we load it.
  useEffect(() => {
    if (rangeInitialized) return;
    let cancelled = false;
    supabase
      .from("projects")
      .select("start_date")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const sd = (data as any)?.start_date as string | null | undefined;
        if (sd) {
          const from = new Date(sd);
          from.setHours(0, 0, 0, 0);
          const to = new Date();
          to.setHours(23, 59, 59, 999);
          setRange({ from, to });
        }
        setRangeInitialized(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, rangeInitialized]);

  // Hook is now project-scoped server-side; alias for clarity downstream.
  const projectChanges = changes;

  const requesterOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    projectChanges.forEach((c) => {
      if (c.requester && !seen.has(c.requester.id)) {
        seen.set(c.requester.id, { id: c.requester.id, name: c.requester.name });
      }
    });
    return Array.from(seen.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ value: m.id, label: m.name }));
  }, [projectChanges]);

  const effectiveRequester = requesterFilter ?? requesterOptions.map((o) => o.value);

  const matching = useMemo(() => {
    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();
    const filtered = projectChanges.filter((c) => {
      if (!c.ticket) return false;
      if (!statusFilter.includes(c.status)) return false;
      if (!effectiveRequester.includes(c.user_id)) return false;
      const t = new Date(c.created_at).getTime();
      if (t < fromMs || t > toMs) return false;
      return matchesSearch(search, c.ticket.formatted_id, c.ticket.title);
    });
    return sortReviewItems(filtered, sort, (c) => ({
      created: new Date(c.created_at).getTime(), ticket: c.ticket?.formatted_id ?? "", hours: Number(c.delta) || 0,
    }));
  }, [projectChanges, statusFilter, effectiveRequester, range.from, range.to, search, sort]);

  const epicGroups = useMemo(() => {
    const rank = new Map(epics.map((e, i) => [`e:${e.id}`, i]));
    return buildChangeRequestGroups({ matching, projectChanges, projects, epics })
      .sort((a, b) => (rank.get(a.key) ?? 1e9) - (rank.get(b.key) ?? 1e9));
  }, [matching, projects, epics, projectChanges]);
  const otherGroups = useMemo(
    () => groupBy === "epic" ? [] : groupReviewItems(matching, groupBy, (c) => ({
      epicKey: "", epicName: "", epicRank: 0, status: c.status,
      requesterId: c.user_id, requesterName: c.requester?.name ?? "Unknown",
    })),
    [matching, groupBy],
  );
  const groups = groupBy === "epic" ? epicGroups : otherGroups;

  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZES.epicChangesPage;
  useEffect(() => {
    setPage(1);
  }, [statusFilter, effectiveRequester.join(","), range.from.getTime(), range.to.getTime(), groupBy, search]);
  const pagedEpics = epicGroups.slice((page - 1) * pageSize, page * pageSize);
  const pagedOthers = otherGroups.slice((page - 1) * pageSize, page * pageSize);

  const {
    rejectTarget,
    setRejectTarget,
    rejectBusy,
    handleApprove,
    handleReject,
    confirmReject,
  } = useChangeDecisions({ user, reload });




  if (!canReview) {
    return (
      <div className="mx-auto max-w-[680px] pt-12 text-center space-y-3">
        <ShieldOff className="h-8 w-8 text-dim mx-auto" />
        <h2 className="font-display text-lg">PMBA only</h2>
        <p className="text-sm text-dim">
          You need the PMBA role on this project to review estimate change requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReviewListToolbar
        groupBy={groupBy} onGroupBy={setGroupBy}
        groupOptions={["none", "epic", "approval", "requester"]}
        sort={sort} onSort={setSort} sortOptions={SORT_OPTIONS}
        search={search} onSearch={setSearch}
        columns={CHANGE_COLUMNS} hidden={hiddenCols} onHidden={setHiddenCols}
        right={
          <div className="text-[11px] text-dimmer">
            {loading ? "Loading…" : `${matching.length} change${matching.length === 1 ? "" : "s"} · ${groups.length} group${groups.length === 1 ? "" : "s"}`}
          </div>
        }
      >
        <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
        <MultiSelectFilter label="Requester" options={requesterOptions} selected={effectiveRequester}
          onChange={setRequesterFilter} searchable />
        <DateRangeControl value={range} onChange={setRange} />
      </ReviewListToolbar>

      {!loading && groups.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
          No change requests match the current filters.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {groupBy === "epic" && pagedEpics.map((g) => {
              const epicIdNum = g.key.startsWith("e:") ? Number(g.key.slice(2)) : null;
              const dh = epicIdNum != null
                ? sumTotals(discountByEpic.get(epicIdNum) ?? { FE: 0, BE: 0, Project: 0 })
                : 0;
              return (
                <EpicChangeCard
                  key={g.key} epicKey={g.key} epicName={g.epicName}
                  projectAcronym={g.projectAcronym} projectId={g.projectId}
                  tickets={g.tickets} changes={g.changes} approvedChanges={g.approvedChanges}
                  onApprove={handleApprove} onReject={handleReject} onOpenTicket={setOpenTicketId}
                  defaultOpen analytics="toggle" hiddenCols={hiddenPos} discountHours={dh}
                />
              );
            })}
            {groupBy !== "epic" && pagedOthers.map((g) => (
              <EpicChangeCard
                key={g.key} epicKey={g.key} epicName={g.title}
                tickets={[]} changes={g.items} approvedChanges={[]}
                onApprove={handleApprove} onReject={handleReject} onOpenTicket={setOpenTicketId}
                defaultOpen analytics="none" hiddenCols={hiddenPos}
              />
            ))}
          </div>
          {groups.length > pageSize && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-dimmer">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, groups.length)} of {groups.length} groups
              </div>
              <ListPagination page={page} total={groups.length} pageSize={pageSize} onChange={setPage} />
            </div>
          )}
        </>
      )}

      <TicketDetailSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicketId(null)}
        ticket={openTicket}
        projectId={projectId}
        onChange={() => {
          reloadTickets();
          reload();
        }}
      />
      <RejectEstimateRevisionDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        originalReason={rejectTarget?.reason ?? null}
        busy={rejectBusy}
        onConfirm={confirmReject}
      />
    </div>
  );
}
