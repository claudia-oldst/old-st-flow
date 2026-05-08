import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DisciplineStatus } from "@/lib/types";
import { healthRatio } from "@/lib/utils";

export type HealthColor = "good" | "warn" | "bad";

export interface TicketFilters {
  epicIds: string[];
  versions: string[];
  statusIds: string[];
  feStatuses: DisciplineStatus[];
  beStatuses: DisciplineStatus[];
  assigneeIds: string[];
  types: string[];
  health: HealthColor[];
}

export const EMPTY_FILTERS: TicketFilters = {
  epicIds: [],
  versions: [],
  statusIds: [],
  feStatuses: [],
  beStatuses: [],
  assigneeIds: [],
  types: [],
  health: [],
};

export function activeFilterCount(f: TicketFilters): number {
  return (
    f.epicIds.length +
    f.versions.length +
    f.statusIds.length +
    f.feStatuses.length +
    f.beStatuses.length +
    f.assigneeIds.length +
    f.types.length +
    f.health.length
  );
}

export function applyFilters(tickets: TicketRow[], f: TicketFilters): TicketRow[] {
  if (activeFilterCount(f) === 0) return tickets;
  return tickets.filter((t) => {
    if (f.epicIds.length) {
      const key = t.epic_id == null ? "_none" : String(t.epic_id);
      if (!f.epicIds.includes(key)) return false;
    }
    if (f.versions.length) {
      const v = t.version?.trim();
      const key = v ? v : "_none";
      if (!f.versions.includes(key)) return false;
    }
    if (f.statusIds.length) {
      const key = t.status_id ?? "_none";
      if (!f.statusIds.includes(key)) return false;
    }
    if (f.feStatuses.length) {
      const hasFE = t.assignees.some((a) => a.slot === "FE");
      if (!hasFE || !f.feStatuses.includes(t.fe_status)) return false;
    }
    if (f.beStatuses.length) {
      const hasBE = t.assignees.some((a) => a.slot === "BE");
      if (!hasBE || !f.beStatuses.includes(t.be_status)) return false;
    }
    if (f.assigneeIds.length) {
      if (t.assignees.length === 0) {
        if (!f.assigneeIds.includes("_unassigned")) return false;
      } else {
        const ids = t.assignees.map((a) => a.user_id);
        if (!ids.some((id) => f.assigneeIds.includes(id))) return false;
      }
    }
    if (f.types.length && !f.types.includes(t.ticket_type)) return false;
    if (f.health.length) {
      const candidates: HealthColor[] = [];
      const hasFE = t.assignees.some((a) => a.slot === "FE");
      const hasBE = t.assignees.some((a) => a.slot === "BE");
      if (hasFE) {
        const h = healthRatio(t.actual_frontend_hours, t.current_fe_estimate);
        if (h !== "none") candidates.push(h);
      }
      if (hasBE) {
        const h = healthRatio(t.actual_backend_hours, t.current_be_estimate);
        if (h !== "none") candidates.push(h);
      }
      if (t.ticket_type === "Proj") {
        const h = healthRatio(t.actual_project_hours, t.current_project_estimate);
        if (h !== "none") candidates.push(h);
      }
      if (!candidates.some((c) => f.health.includes(c))) return false;
    }
    return true;
  });
}
