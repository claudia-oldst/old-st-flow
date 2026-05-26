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
import { MultiSelectFilter } from "@/features/estimates/MultiSelectFilter";
import { EpicChangeCard } from "@/features/estimates/EpicChangeCard";
import { DateRangeControl, defaultRange, type DateRange } from "@/features/health/DateRangeControl";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { ListPagination } from "@/components/ListPagination";
import { PAGE_SIZES } from "@/lib/pagination";
import { buildChangeRequestGroups } from "./project-change-requests/buildChangeRequestGroups";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";
import { discountTotalsByEpic, sumTotals } from "@/features/discounts/applyDiscounts";

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

  const [statusFilter, setStatusFilter] = useState<string[]>(["pending"]);
  const [requesterFilter, setRequesterFilter] = useState<string[] | null>(null);
  const [range, setRange] = useState<DateRange>(() => defaultRange());
  const [rangeInitialized, setRangeInitialized] = useState(false);
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
    return projectChanges.filter((c) => {
      if (!c.ticket) return false;
      if (!statusFilter.includes(c.status)) return false;
      if (!effectiveRequester.includes(c.user_id)) return false;
      const t = new Date(c.created_at).getTime();
      if (t < fromMs || t > toMs) return false;
      return true;
    });
  }, [projectChanges, statusFilter, effectiveRequester, range.from, range.to]);

  const groups = useMemo(
    () => buildChangeRequestGroups({ matching, projectChanges, projects, epics }),
    [matching, projects, epics, projectChanges],
  );

  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZES.epicChangesPage;
  useEffect(() => {
    setPage(1);
  }, [statusFilter, effectiveRequester.join(","), range.from.getTime(), range.to.getTime()]);
  const pagedGroups = useMemo(
    () => groups.slice((page - 1) * pageSize, page * pageSize),
    [groups, page, pageSize],
  );

  const handleApprove = async (row: ChangeRow) => {
    if (!user) return toast.error("Sign in first");
    if (row.status !== "pending") return toast.message("Already decided");
    const decideAt = new Date().toISOString();
    const { error: updErr, data: updated } = await supabase
      .from("ticket_estimate_changes")
      .update({ status: "approved", decided_by: user.id, decided_at: decideAt })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (updErr) return toast.error(updErr.message);
    if (!updated) return toast.message("Already decided");

    const t = row.ticket;
    if (t) {
      const patch =
        row.discipline === "FE"
          ? { current_fe_estimate: t.current_fe_estimate + row.delta }
          : row.discipline === "BE"
          ? { current_be_estimate: t.current_be_estimate + row.delta }
          : { current_project_estimate: t.current_project_estimate + row.delta };
      const { error: tErr } = await supabase.from("tickets").update(patch).eq("id", t.id);
      if (tErr) return toast.error(tErr.message);
    }
    toast.success("Change request approved");
    reload();
  };

  const handleReject = async (row: ChangeRow) => {
    if (!user) return toast.error("Sign in first");
    if (row.status !== "pending") return toast.message("Already decided");
    const { error } = await supabase
      .from("ticket_estimate_changes")
      .update({ status: "rejected", decided_by: user.id, decided_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending");
    if (error) return toast.error(error.message);
    toast.success("Change request rejected");
    reload();
  };

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
      <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap sticky top-14 z-30">
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <MultiSelectFilter
          label="Requester"
          options={requesterOptions}
          selected={effectiveRequester}
          onChange={setRequesterFilter}
          searchable
        />
        <div className="h-5 w-px bg-white/10 mx-1" />
        <DateRangeControl value={range} onChange={setRange} />
        <div className="ml-auto text-[11px] text-dimmer">
          {loading
            ? "Loading…"
            : `${matching.length} change${matching.length === 1 ? "" : "s"} · ${groups.length} epic${
                groups.length === 1 ? "" : "s"
              }`}
        </div>
      </div>

      {!loading && groups.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
          No change requests match the current filters.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pagedGroups.map((g) => {
              const epicIdNum = g.key.startsWith("e:") ? Number(g.key.slice(2)) : null;
              const dh = epicIdNum != null
                ? sumTotals(discountByEpic.get(epicIdNum) ?? { FE: 0, BE: 0, Project: 0 })
                : 0;
              return (
                <EpicChangeCard
                  key={g.key}
                  epicKey={g.key}
                  epicName={g.epicName}
                  projectAcronym={g.projectAcronym}
                  projectId={g.projectId}
                  tickets={g.tickets}
                  changes={g.changes}
                  approvedChanges={g.approvedChanges}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onOpenTicket={setOpenTicketId}
                  defaultOpen={statusFilter.includes("pending") && g.changes.length <= 5}
                  range={range}
                  discountHours={dh}
                />
              );
            })}
          </div>
          {groups.length > pageSize && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-dimmer">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, groups.length)} of {groups.length} epics
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
    </div>
  );
}
