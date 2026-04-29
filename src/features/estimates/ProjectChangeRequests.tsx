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

const NO_EPIC_KEY = (projectId: string) => `noepic:${projectId}`;
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function ProjectChangeRequests({ projectId }: { projectId: string }) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const canReview = isPMBA(role);
  const { changes, projects, epics, loading, reload } = useAllEstimateChanges();

  const [statusFilter, setStatusFilter] = useState<string[]>(["pending"]);
  const [requesterFilter, setRequesterFilter] = useState<string[] | null>(null);
  const [range, setRange] = useState<DateRange>(() => defaultRange());
  const [rangeInitialized, setRangeInitialized] = useState(false);

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

  // Scope everything to this project up-front.
  const projectChanges = useMemo(
    () => changes.filter((c) => c.ticket?.project_id === projectId),
    [changes, projectId]
  );

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
    return projectChanges.filter((c) => {
      if (!c.ticket) return false;
      if (!statusFilter.includes(c.status)) return false;
      if (!effectiveRequester.includes(c.user_id)) return false;
      return true;
    });
  }, [projectChanges, statusFilter, effectiveRequester]);

  const groups = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const epicMap = new Map(epics.map((e) => [e.id, e]));

    const buckets = new Map<
      string,
      {
        key: string;
        epicName: string;
        projectAcronym: string;
        projectId: string;
        ticketIds: Set<string>;
        ticketsById: Map<string, ChangeRow["ticket"]>;
        changes: ChangeRow[];
      }
    >();

    matching.forEach((c) => {
      if (!c.ticket) return;
      const projId = c.ticket.project_id;
      const proj = projectMap.get(projId);
      const key =
        c.ticket.epic_id != null ? `e:${c.ticket.epic_id}` : NO_EPIC_KEY(projId);
      const epicName =
        c.ticket.epic_id != null
          ? epicMap.get(c.ticket.epic_id)?.epic_name ?? `Epic ${c.ticket.epic_id}`
          : "No epic";
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          epicName,
          projectAcronym: proj?.acronym ?? "?",
          projectId: projId,
          ticketIds: new Set(),
          ticketsById: new Map(),
          changes: [],
        });
      }
      const b = buckets.get(key)!;
      b.changes.push(c);
      b.ticketIds.add(c.ticket.id);
      b.ticketsById.set(c.ticket.id, c.ticket);
    });

    const approvedByTicket = new Map<string, ChangeRow[]>();
    projectChanges.forEach((c) => {
      if (c.status !== "approved" || !c.ticket) return;
      const arr = approvedByTicket.get(c.ticket.id) ?? [];
      arr.push(c);
      approvedByTicket.set(c.ticket.id, arr);
    });

    return Array.from(buckets.values())
      .map((b) => {
        const tickets = Array.from(b.ticketsById.values()).filter(Boolean) as NonNullable<
          ChangeRow["ticket"]
        >[];
        const approvedChanges: ChangeRow[] = [];
        b.ticketIds.forEach((tid) => {
          (approvedByTicket.get(tid) ?? []).forEach((c) => approvedChanges.push(c));
        });
        return { ...b, tickets, approvedChanges };
      })
      .sort((a, b) => b.changes.length - a.changes.length);
  }, [matching, projects, epics, projectChanges]);

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
        <div className="space-y-3">
          {groups.map((g) => (
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
              defaultOpen={statusFilter.includes("pending") && g.changes.length <= 5}
            />
          ))}
        </div>
      )}
    </div>
  );
}
