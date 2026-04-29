import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import {
  useAllEstimateChanges,
  type ChangeRow,
} from "@/features/estimates/useAllEstimateChanges";
import { MultiSelectFilter } from "@/features/estimates/MultiSelectFilter";
import { EpicChangeCard } from "@/features/estimates/EpicChangeCard";

const NO_EPIC_KEY = (projectId: string) => `noepic:${projectId}`;
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ChangeRequests() {
  const user = useCurrentUser((s) => s.user);
  const isPMBA = user?.role === "PMBA";
  const { changes, projects, epics, loading, reload } = useAllEstimateChanges();

  const [statusFilter, setStatusFilter] = useState<string[]>(["pending"]);
  const [requesterFilter, setRequesterFilter] = useState<string[] | null>(null);
  const [projectFilter, setProjectFilter] = useState<string[] | null>(null);

  const requesterOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    changes.forEach((c) => {
      if (c.requester && !seen.has(c.requester.id)) {
        seen.set(c.requester.id, { id: c.requester.id, name: c.requester.name });
      }
    });
    return Array.from(seen.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ value: m.id, label: m.name }));
  }, [changes]);

  const projectOptions = useMemo(
    () =>
      projects
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: `${p.acronym} · ${p.name}` })),
    [projects]
  );

  // Initialize "all selected" defaults when options first arrive.
  const effectiveRequester =
    requesterFilter ?? requesterOptions.map((o) => o.value);
  const effectiveProject = projectFilter ?? projectOptions.map((o) => o.value);

  const matching = useMemo(() => {
    return changes.filter((c) => {
      if (!c.ticket) return false;
      if (!statusFilter.includes(c.status)) return false;
      if (!effectiveRequester.includes(c.user_id)) return false;
      if (!effectiveProject.includes(c.ticket.project_id)) return false;
      return true;
    });
  }, [changes, statusFilter, effectiveRequester, effectiveProject]);

  // Group matching changes by epic key (project + epic_id).
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

    // For each group, also collect approved-status changes for those tickets so the chart
    // can show the real "current" line independent of the active filter.
    const approvedByTicket = new Map<string, ChangeRow[]>();
    changes.forEach((c) => {
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
  }, [matching, projects, epics, changes]);

  const handleApprove = async (row: ChangeRow) => {
    if (!user) return toast.error("Sign in first");
    if (row.status !== "pending") {
      return toast.message("Already decided");
    }
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

    // Apply delta to the ticket's current estimate for that discipline.
    const t = row.ticket;
    if (t) {
      const patch: Record<string, number> = {};
      if (row.discipline === "FE") patch.current_fe_estimate = t.current_fe_estimate + row.delta;
      if (row.discipline === "BE") patch.current_be_estimate = t.current_be_estimate + row.delta;
      if (row.discipline === "Project")
        patch.current_project_estimate = t.current_project_estimate + row.delta;
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

  if (!isPMBA) {
    return (
      <div className="mx-auto max-w-[680px] px-6 pt-20 text-center space-y-3">
        <ShieldOff className="h-8 w-8 text-dim mx-auto" />
        <h1 className="font-display text-xl">PMBA only</h1>
        <p className="text-sm text-dim">
          You need the PMBA role to review estimate change requests.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 pt-6 pb-12 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Change requests</h1>
          <p className="text-xs text-dim">
            Review estimate change requests across all projects, grouped by epic.
          </p>
        </div>
      </div>

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
        <MultiSelectFilter
          label="Project"
          options={projectOptions}
          selected={effectiveProject}
          onChange={setProjectFilter}
          searchable
        />
        <div className="ml-auto text-[11px] text-dimmer">
          {loading ? "Loading…" : `${matching.length} change${matching.length === 1 ? "" : "s"} · ${groups.length} epic${groups.length === 1 ? "" : "s"}`}
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
