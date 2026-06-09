import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DisciplineStatus } from "@/lib/types";

export type GroupBy = "none" | "status" | "assignee" | "type" | "epic" | "version" | "fe_status" | "be_status";

export const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

export interface Group {
  key: string;
  label: string;
  color?: string;
  tickets: TicketRow[];
}

export type ColKey =
  | "id"
  | "title"
  | "epic"
  | "version"
  | "status"
  | "dev_status"
  | "fe"
  | "be"
  | "assignees"
  | "fe_pool"
  | "be_pool";


export interface ColDef {
  key: ColKey;
  label: string;
  default: number;
  min: number;
  align?: "left" | "right";
}

export const COLS: Record<ColKey, ColDef> = {
  id: { key: "id", label: "ID", default: 90, min: 70 },
  title: { key: "title", label: "Title", default: 320, min: 160 },
  epic: { key: "epic", label: "Epic", default: 160, min: 100 },
  version: { key: "version", label: "Version", default: 110, min: 80 },
  status: { key: "status", label: "Status", default: 140, min: 100 },
  dev_status: { key: "dev_status", label: "Dev status", default: 200, min: 140 },
  fe: { key: "fe", label: "FE", default: 110, min: 80, align: "right" },
  be: { key: "be", label: "BE", default: 110, min: 80, align: "right" },
  assignees: { key: "assignees", label: "Assignees", default: 200, min: 120 },
  fe_pool: { key: "fe_pool", label: "FE Pool", default: 120, min: 90 },
  be_pool: { key: "be_pool", label: "BE Pool", default: 120, min: 90 },
};


export const STORAGE_KEY = "tickets-list-col-widths-v1";
export const SORT_STORAGE_KEY = "tickets-list-sort-v1";

export type SortDir = "asc" | "desc";
export interface SortState {
  key: ColKey;
  dir: SortDir;
}

export const SORTABLE: Record<ColKey, boolean> = {
  id: true,
  title: true,
  epic: true,
  version: true,
  status: true,
  dev_status: true,
  fe: true,
  be: true,
  assignees: true,
  fe_pool: true,
  be_pool: true,
};


export const DISC_ORDER: Record<DisciplineStatus, number> = {
  todo: 0,
  in_progress: 1,
  for_integration: 2,
  done: 3,
};

export function loadWidths(): Partial<Record<ColKey, number>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function loadSort(): SortState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
