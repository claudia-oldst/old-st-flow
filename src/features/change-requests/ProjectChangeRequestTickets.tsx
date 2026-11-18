import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { AddTicketsDialog } from "@/features/tickets/AddTicketsDialog";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { MultiSelectFilter } from "@/features/_shared/filters/MultiSelectFilter";
import { DateRangeControl, defaultRange, type DateRange } from "@/features/_shared/DateRangeControl";
import { EpicCRCard, crColumns } from "./EpicCRCard";
import { crEstimate } from "./epic-cr/useEpicCR";
import { ReviewListToolbar } from "@/features/_shared/review-list/ReviewListToolbar";
import { useHiddenColumns, hiddenPositions } from "@/features/_shared/review-list/useHiddenColumns";
import {
  DEFAULT_REVIEW_GROUP, DEFAULT_REVIEW_STATUS, groupReviewItems, matchesSearch, sortReviewItems,
  type ReviewGroupBy, type ReviewSort,
} from "@/features/_shared/review-list/reviewList";

const CR_COLUMNS = crColumns(false);
const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "ticket", label: "Ticket ID" },
  { value: "hours", label: "Largest estimate" },
];
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { discountTotalsByEpic, sumTotals } from "@/features/discounts/applyDiscounts";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const NO_EPIC_KEY = "no-epic";

export function ProjectChangeRequestTickets({ projectId }: { projectId: string }) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const canReview = isPMBA(role);
  const { tickets, reload } = useProjectTickets(projectId);
  const { epics } = useProjectEpics(projectId);
  const { discounts } = useEpicDiscounts(projectId);
  const discountByEpic = useMemo(() => discountTotalsByEpic(discounts), [discounts]);

  const [statusFilter, setStatusFilter] = useState<string[]>(DEFAULT_REVIEW_STATUS);
  const [range, setRange] = useState<DateRange>(() => defaultRange());
  const [rangeInitialized, setRangeInitialized] = useState(false);
  const [groupBy, setGroupBy] = useState<ReviewGroupBy>(DEFAULT_REVIEW_GROUP);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [search, setSearch] = useState("");
  const [hiddenCols, setHiddenCols] = useHiddenColumns("pulse:change-requests:hidden-cols");
  const hiddenPos = hiddenPositions(CR_COLUMNS, hiddenCols);
  const [addOpen, setAddOpen] = useState(false);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [acronym, setAcronym] = useState<string>("?");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("projects")
      .select("acronym, start_date")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setAcronym(data.acronym ?? "?");
        if (!rangeInitialized && (data as any).start_date) {
          const from = new Date((data as any).start_date);
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

  const crTickets = useMemo(
    () => tickets.filter((t) => t.ticket_type === "CR"),
    [tickets]
  );
  // Original scope = Std/Proj tickets only; Bugs and CRs are never part of the original estimate.
  const baselineTickets = useMemo(
    () => tickets.filter((t) => t.ticket_type === "Standard" || t.ticket_type === "Proj"),
    [tickets]
  );

  const filteredCRs = useMemo(() => {
    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();
    const list = crTickets.filter((t) => {
      if (!statusFilter.includes(t.cr_approval)) return false;
      const ts = new Date(t.created_at).getTime();
      if (ts < fromMs || ts > toMs) return false;
      return matchesSearch(search, t.formatted_id, t.title);
    });
    return sortReviewItems(list, sort, (t) => ({
      created: new Date(t.created_at).getTime(), ticket: t.formatted_id, hours: crEstimate(t),
    }));
  }, [crTickets, statusFilter, range.from, range.to, search, sort]);

  const otherGroups = useMemo(
    () => groupBy === "epic" ? [] : groupReviewItems(filteredCRs, groupBy, (t) => ({
      epicKey: "", epicName: "", epicRank: 0, status: t.cr_approval ?? "pending",
      requesterId: null, requesterName: "",
    })),
    [filteredCRs, groupBy],
  );

  const groups = useMemo(() => {
    const epicMap = new Map(epics.map((e) => [e.id, e]));
    const epicRank = new Map(epics.map((e, i) => [e.id, i]));
    type Bucket = {
      key: string;
      epicId: number | null;
      epicName: string;
      filtered: TicketRow[];
      all: TicketRow[];
    };
    const buckets = new Map<string, Bucket>();
    // Seed with epics that have ANY CR (so they show even if filter hides all)
    crTickets.forEach((t) => {
      const key = t.epic_id != null ? `e:${t.epic_id}` : NO_EPIC_KEY;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          epicId: t.epic_id,
          epicName:
            t.epic_id != null
              ? epicMap.get(t.epic_id)?.epic_name ?? `Epic ${t.epic_id}`
              : "No epic",
          filtered: [],
          all: [],
        });
      }
      buckets.get(key)!.all.push(t);
    });
    filteredCRs.forEach((t) => {
      const key = t.epic_id != null ? `e:${t.epic_id}` : NO_EPIC_KEY;
      buckets.get(key)?.filtered.push(t);
    });

    return Array.from(buckets.values())
      .map((b) => ({
        ...b,
        baseline: baselineTickets.filter((t) => t.epic_id === b.epicId),
      }))
      .sort((a, b) => {
        const rank = (id: number | null) =>
          id == null ? Number.MAX_SAFE_INTEGER : epicRank.get(id) ?? Number.MAX_SAFE_INTEGER - 1;
        return rank(a.epicId) - rank(b.epicId);
      });
  }, [crTickets, filteredCRs, baselineTickets, epics]);

  const handleApprove = async (t: TicketRow) => {
    if (!user) return toast.error("Sign in first");
    const { error } = await supabase
      .from("tickets")
      .update({
        cr_approval: "approved",
        cr_decided_by: user.id,
        cr_decided_at: new Date().toISOString(),
      })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("CR approved");
    reload();
  };

  const handleReject = async (t: TicketRow) => {
    if (!user) return toast.error("Sign in first");
    const { error } = await supabase
      .from("tickets")
      .update({
        cr_approval: "rejected",
        cr_decided_by: user.id,
        cr_decided_at: new Date().toISOString(),
      })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("CR rejected");
    reload();
  };

  return (
    <div className="space-y-6">
      <ReviewListToolbar
        groupBy={groupBy} onGroupBy={setGroupBy} groupOptions={["none", "epic", "approval"]}
        sort={sort} onSort={setSort} sortOptions={SORT_OPTIONS}
        search={search} onSearch={setSearch}
        columns={CR_COLUMNS} hidden={hiddenCols} onHidden={setHiddenCols}
        right={
          <>
            <div className="text-[11px] text-dimmer">
              {filteredCRs.length} CR{filteredCRs.length === 1 ? "" : "s"}
            </div>
            {canReview && (
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Ticket
              </Button>
            )}
          </>
        }
      >
        <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
        <DateRangeControl value={range} onChange={setRange} />
      </ReviewListToolbar>

      {groups.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
          No change request tickets in this project yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groupBy !== "epic" && otherGroups.map((g) => (
            <EpicCRCard
              key={g.key} epicKey={g.key} epicName={g.title}
              baselineTickets={[]} filteredCRs={g.items} allCRs={g.items}
              canReview={canReview} onApprove={handleApprove} onReject={handleReject}
              onOpenTicket={(t) => setOpenTicket(t)} defaultOpen analytics="none" hiddenCols={hiddenPos}
            />
          ))}
          {groupBy === "epic" && groups.filter((g) => g.filtered.length > 0).map((g) => {
            const dh = g.epicId != null
              ? sumTotals(discountByEpic.get(g.epicId) ?? { FE: 0, BE: 0, Project: 0 })
              : 0;
            return (
              <EpicCRCard
                key={g.key}
                epicKey={g.key}
                epicName={g.epicName}
                projectAcronym={acronym}
                baselineTickets={g.baseline}
                filteredCRs={g.filtered}
                allCRs={g.all}
                canReview={canReview}
                onApprove={handleApprove}
                onReject={handleReject}
                onOpenTicket={(t) => setOpenTicket(t)}
                defaultOpen
                analytics="toggle"
                hiddenCols={hiddenPos}
                discountHours={dh}
              />
            );
          })}
        </div>
      )}

      <AddTicketsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        defaultType="CR"
        onCreated={reload}
      />

      <TicketDetailSheet
        ticket={openTicket}
        projectId={projectId}
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        onChange={reload}
      />
    </div>
  );
}
