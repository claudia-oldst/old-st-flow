import type { TicketType } from "@/lib/types";
import type { Draft } from "@/features/tickets/add-dialog/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

type Slot = "FE" | "BE" | "Project";

/** Pre-fills the shared create-ticket row with the Feedback ticket's current details. */
export function draftFromTicket(t: TicketRow): Draft {
  const by = (s: Slot) => new Set(t.assignees.filter((a) => a.slot === s).map((a) => a.user_id));
  return {
    key: t.id,
    title: t.title,
    type: "Standard",
    epicId: t.epic_id,
    statusId: t.status_id,
    fe: String(t.current_fe_estimate ?? 0),
    be: String(t.current_be_estimate ?? 0),
    proj: String(t.current_project_estimate ?? 0),
    version: t.version ?? "",
    assignees: { fe: by("FE"), be: by("BE"), project: by("Project") },
    parentTicketId: t.parent_ticket_id,
    parentTitle: t.parent?.title ?? null,
  };
}

export type ConvertPlan = {
  args: { _new_type: TicketType; _parent_id: string | null; _epic_id: number | null };
  /** Only fields the PMBA actually changed. Originals and time logs are never included. */
  patch: Record<string, unknown>;
  addAssignees: { user_id: string; slot: Slot }[];
  removeAssignees: { user_id: string; slot: Slot }[];
};

const num = (s: string, cur: number) => {
  const n = s.trim() === "" ? 0 : Number(s);
  return Number.isFinite(n) && n !== Number(cur ?? 0) ? n : undefined;
};

export function buildConvert(d: Draft, t: TicketRow): { error: string } | ConvertPlan {
  if (d.type === "Feedback") return { error: "Choose a ticket type" };
  if (!d.title.trim()) return { error: "Title is required" };
  if (d.epicId === null) return { error: "Choose an epic" };
  if (d.type === "Bug" && !d.parentTicketId) return { error: "A bug needs a parent ticket" };

  const patch: Record<string, unknown> = {};
  if (d.title.trim() !== t.title) patch.title = d.title.trim();
  if (d.statusId !== t.status_id && d.statusId) { patch.status_id = d.statusId; patch.project_status_override = true; }
  const v = d.version.trim() || null;
  if (v !== (t.version ?? null)) patch.version = v;
  if (d.type === "Proj") {
    const p = num(d.proj, t.current_project_estimate); if (p !== undefined) patch.current_project_estimate = p;
  } else {
    const fe = num(d.fe, t.current_fe_estimate); if (fe !== undefined) patch.current_fe_estimate = fe;
    const be = num(d.be, t.current_be_estimate); if (be !== undefined) patch.current_be_estimate = be;
  }

  const want: { user_id: string; slot: Slot }[] = [
    ...[...d.assignees.fe].map((u) => ({ user_id: u, slot: "FE" as Slot })),
    ...[...d.assignees.be].map((u) => ({ user_id: u, slot: "BE" as Slot })),
    ...[...d.assignees.project].map((u) => ({ user_id: u, slot: "Project" as Slot })),
  ];
  const k = (a: { user_id: string; slot: Slot }) => `${a.slot}:${a.user_id}`;
  const have = t.assignees.map((a) => ({ user_id: a.user_id, slot: a.slot }));
  const haveK = new Set(have.map(k)), wantK = new Set(want.map(k));

  return {
    args: {
      _new_type: d.type,
      _parent_id: d.type === "Proj" ? null : d.parentTicketId,
      _epic_id: d.epicId === t.epic_id ? null : d.epicId,
    },
    patch,
    addAssignees: want.filter((a) => !haveK.has(k(a))),
    removeAssignees: have.filter((a) => !wantK.has(k(a))),
  };
}
