import type { Draft } from "@/features/tickets/add-dialog/types";

const num = (s: string) => (s.trim() === "" ? null : parseFloat(s) || 0);

/** Validates a convert draft and builds the ticket patch applied before conversion. */
export function buildConvertPatch(d: Draft): { error: string } | { patch: Record<string, unknown> } {
  if (!d.title.trim()) return { error: "Title is required" };
  if (d.type === "Feedback") return { error: "Choose a ticket type" };
  if (d.epicId === null) return { error: "Choose an epic" };
  if (d.type === "Bug" && !d.parentTicketId) return { error: "A bug needs a parent ticket" };
  const isProj = d.type === "Proj";
  const fe = num(d.fe), be = num(d.be);
  const proj = isProj ? (num(d.proj) ?? (fe !== null || be !== null ? (fe ?? 0) + (be ?? 0) : null)) : null;
  return {
    patch: {
      title: d.title.trim(),
      epic_id: d.epicId,
      status_id: d.statusId,
      version: d.version.trim() || null,
      original_fe_estimate: isProj ? null : fe,
      current_fe_estimate: isProj ? null : fe,
      original_be_estimate: isProj ? null : be,
      current_be_estimate: isProj ? null : be,
      original_project_estimate: proj,
      current_project_estimate: proj,
    },
  };
}
