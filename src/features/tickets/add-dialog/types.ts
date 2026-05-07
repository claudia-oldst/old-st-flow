import type { TicketType } from "@/lib/types";

export type Slot = "FE" | "BE" | "Project";

export interface DraftAssignees {
  fe: Set<string>;
  be: Set<string>;
  project: Set<string>;
}

export interface Draft {
  key: string;
  title: string;
  type: TicketType;
  epicId: number | null;
  statusId: string | null;
  fe: string;
  be: string;
  proj: string;
  assignees: DraftAssignees;
}

export const newDraft = (statusId: string | null = null, type: TicketType = "Standard"): Draft => ({
  key: Math.random().toString(36).slice(2),
  title: "",
  type,
  epicId: null,
  statusId,
  fe: "",
  be: "",
  proj: "",
  assignees: { fe: new Set(), be: new Set(), project: new Set() },
});
