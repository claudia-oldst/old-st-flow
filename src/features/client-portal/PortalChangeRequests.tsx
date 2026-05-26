import { useMemo, useState } from "react";
import { MultiSelectFilter } from "@/features/estimates/MultiSelectFilter";
import { EpicCRCard } from "@/features/change-requests/EpicCRCard";
import { ClientTicketSheet } from "./ClientTicketSheet";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const NO_EPIC_KEY = "no-epic";

export interface PortalCRViewTicket {
  id: string;
  formatted_id: string;
  title: string;
  ticket_type: "CR" | "Standard" | "Bug" | "Proj";
  epic_id: number | null;
  acceptance_criteria: string | null;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  original_fe_estimate: number;
  original_be_estimate: number;
  original_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  cr_approval: "pending" | "approved" | "rejected";
  cr_decided_at: string | null;
  created_at: string;
}

interface Props {
  acronym: string;
  epics: Array<{ id: number; epic_name: string | null }>;
  baselineTickets: PortalCRViewTicket[];
  crTickets: PortalCRViewTicket[];
  onApprove: (ticketId: string) => Promise<void>;
}

/** Pad a partial ticket up to a TicketRow so EpicCRCard can consume it directly. */
function asTicketRow(t: PortalCRViewTicket): TicketRow {
  return {
    id: t.id,
    project_id: "",
    ticket_number: 0,
    formatted_id: t.formatted_id,
    title: t.title,
    ticket_type: t.ticket_type,
    status_id: null,
    fe_status: "todo",
    be_status: "todo",
    project_status_override: false,
    epic_id: t.epic_id,
    epic_name: null,
    version: null,
    original_fe_estimate: Number(t.original_fe_estimate) || 0,
    original_be_estimate: Number(t.original_be_estimate) || 0,
    current_fe_estimate: Number(t.current_fe_estimate) || 0,
    current_be_estimate: Number(t.current_be_estimate) || 0,
    original_project_estimate: Number(t.original_project_estimate) || 0,
    current_project_estimate: Number(t.current_project_estimate) || 0,
    actual_frontend_hours: Number(t.actual_frontend_hours) || 0,
    actual_backend_hours: Number(t.actual_backend_hours) || 0,
    actual_project_hours: Number(t.actual_project_hours) || 0,
    acceptance_criteria: t.acceptance_criteria,
    position: 0,
    created_at: t.created_at,
    cr_approval: t.cr_approval,
    cr_decided_by: null,
    cr_decided_at: t.cr_decided_at,
    parent_ticket_id: null,
    bug_sub_number: null,
    github_issue_number: null,
    parent: null,
    assignees: [],
  };
}

export function PortalChangeRequests({
  acronym,
  epics,
  baselineTickets,
  crTickets,
  onApprove,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<string[]>(["pending", "approved"]);
  const [openTicket, setOpenTicket] = useState<PortalCRViewTicket | null>(null);

  const range = useMemo(() => {
    const stamps = crTickets.map((t) => new Date(t.created_at).getTime());
    const from = stamps.length ? new Date(Math.min(...stamps)) : new Date(Date.now() - 86_400_000 * 30);
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, [crTickets]);

  const filteredCRs = useMemo(
    () => crTickets.filter((t) => statusFilter.includes(t.cr_approval)),
    [crTickets, statusFilter],
  );

  const groups = useMemo(() => {
    const epicMap = new Map(epics.map((e) => [e.id, e]));
    type Bucket = {
      key: string;
      epicId: number | null;
      epicName: string;
      filtered: PortalCRViewTicket[];
      all: PortalCRViewTicket[];
    };
    const buckets = new Map<string, Bucket>();
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
      .sort((a, b) => b.all.length - a.all.length);
  }, [crTickets, filteredCRs, baselineTickets, epics]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <div className="ml-auto text-[11px] text-dimmer">
          {filteredCRs.length} CR{filteredCRs.length === 1 ? "" : "s"} · {groups.length} epic
          {groups.length === 1 ? "" : "s"}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-dim">
          No change requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <EpicCRCard
              key={g.key}
              epicKey={g.key}
              epicName={g.epicName}
              projectAcronym={acronym}
              baselineTickets={g.baseline.map(asTicketRow)}
              filteredCRs={g.filtered.map(asTicketRow)}
              allCRs={g.all.map(asTicketRow)}
              canReview={true}
              hideReject
              onApprove={(t) => onApprove(t.id)}
              onReject={() => {}}
              onOpenTicket={(t) => {
                const found = crTickets.find((c) => c.id === t.id) ?? null;
                setOpenTicket(found);
              }}
              defaultOpen={g.filtered.length > 0 && g.filtered.length <= 8}
              range={range}
            />
          ))}
        </div>
      )}

      <ClientTicketSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        ticket={openTicket}
      />
    </div>
  );
}
