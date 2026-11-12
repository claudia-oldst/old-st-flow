import type { TicketType } from "@/lib/types";

export type ConvertForm = {
  type: TicketType;
  epicId: number | null;
  parentTicketId: string | null;
};

/**
 * Validates a feedback conversion and builds the RPC args. Only the type,
 * parent link and (optionally) epic change — estimates, status, assignees,
 * time logs and discussion are never touched.
 */
export function buildConvertArgs(f: ConvertForm, currentEpicId: number | null):
  { error: string } | { args: { _new_type: TicketType; _parent_id: string | null; _epic_id: number | null } } {
  if (f.type === "Feedback") return { error: "Choose a ticket type" };
  if (f.epicId === null) return { error: "Choose an epic" };
  if (f.type === "Bug" && !f.parentTicketId) return { error: "A bug needs a parent ticket" };
  return {
    args: {
      _new_type: f.type,
      _parent_id: f.type === "Proj" ? null : f.parentTicketId,
      _epic_id: f.epicId === currentEpicId ? null : f.epicId,
    },
  };
}
