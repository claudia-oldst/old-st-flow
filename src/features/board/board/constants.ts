import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DisciplineStatus } from "@/lib/types";

export type BoardMode = "project" | "discipline";

export const DISCIPLINE_STATUSES: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

export interface DisciplineCard {
  ticket: TicketRow;
  slot: "FE" | "BE" | "Project";
  status: DisciplineStatus;
}

export const CATEGORY_TO_DISCIPLINE: Record<string, DisciplineStatus> = {
  backlog: "todo",
  active: "in_progress",
  "dev done": "for_integration",
  done: "done",
};

export const DISCIPLINE_TO_CATEGORY: Record<DisciplineStatus, "backlog" | "active" | "dev done" | "done"> = {
  todo: "backlog",
  in_progress: "active",
  for_integration: "dev done",
  done: "done",
};
