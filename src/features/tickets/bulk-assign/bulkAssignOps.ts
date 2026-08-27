import { supabase } from "@/integrations/supabase/client";

export type Slot = "FE" | "BE" | "OtherStd" | "Proj";
export type SlotColumn = "FE" | "BE" | "Project";
export type SlotMaps = Record<Slot, Map<string, Set<string>>>;

export const slotColumnFor = (s: Slot): SlotColumn =>
  s === "FE" ? "FE" : s === "BE" ? "BE" : "Project";

export const emptySlotMaps = (): SlotMaps => ({
  FE: new Map(),
  BE: new Map(),
  OtherStd: new Map(),
  Proj: new Map(),
});

/** Load the selected tickets and bucket their existing assignees per slot. */
export async function loadBulkAssignState(ticketIds: string[]) {
  const { data: ticketRows } = await supabase
    .from("tickets")
    .select("id, ticket_type")
    .in("id", ticketIds);

  const proj = new Set<string>();
  const std = new Set<string>();
  (ticketRows ?? []).forEach((t: { id: string; ticket_type: string }) => {
    if (t.ticket_type === "Proj") proj.add(t.id);
    else std.add(t.id);
  });

  const { data: assigneeRows } = await supabase
    .from("ticket_assignees")
    .select("ticket_id, user_id, slot")
    .in("ticket_id", ticketIds);

  const existing = emptySlotMaps();
  (assigneeRows ?? []).forEach(
    (r: { ticket_id: string; user_id: string; slot: SlotColumn }) => {
      let bucket: Slot;
      if (r.slot === "FE") bucket = "FE";
      else if (r.slot === "BE") bucket = "BE";
      else bucket = proj.has(r.ticket_id) ? "Proj" : "OtherStd";
      const map = existing[bucket];
      const set = map.get(r.user_id) ?? new Set<string>();
      set.add(r.ticket_id);
      map.set(r.user_id, set);
    },
  );

  return { proj, std, existing };
}

export interface SlotJob {
  slot: Slot;
  selected: Set<string>;
  applicable: Set<string>;
}

/** Compute the insert/delete payloads needed to reach the selected state. */
export function buildAssignmentDiff(jobs: SlotJob[], existing: SlotMaps) {
  const inserts: { ticket_id: string; user_id: string; slot: SlotColumn }[] = [];
  const deletes: { slot: Slot; user_id: string; ticket_ids: string[] }[] = [];

  for (const { slot, selected, applicable } of jobs) {
    const slotCol = slotColumnFor(slot);
    const existingMap = existing[slot];

    selected.forEach((uid) => {
      const have = existingMap.get(uid) ?? new Set<string>();
      applicable.forEach((tid) => {
        if (!have.has(tid)) inserts.push({ ticket_id: tid, user_id: uid, slot: slotCol });
      });
    });

    existingMap.forEach((tids, uid) => {
      if (!selected.has(uid)) deletes.push({ slot, user_id: uid, ticket_ids: Array.from(tids) });
    });
  }

  return { inserts, deletes };
}

/** Apply inserts and deletes; returns an error message when something failed. */
export async function applyAssignmentDiff(
  inserts: ReturnType<typeof buildAssignmentDiff>["inserts"],
  deletes: ReturnType<typeof buildAssignmentDiff>["deletes"],
): Promise<string | null> {
  if (inserts.length) {
    const { error } = await supabase.from("ticket_assignees").insert(inserts);
    if (error) return error.message;
  }
  for (const d of deletes) {
    if (!d.ticket_ids.length) continue;
    const { error } = await supabase
      .from("ticket_assignees")
      .delete()
      .eq("user_id", d.user_id)
      .eq("slot", slotColumnFor(d.slot))
      .in("ticket_id", d.ticket_ids);
    if (error) return error.message;
  }
  return null;
}

/** Reset FE/BE status to "todo" on standard tickets left without an assignee. */
export async function resetUnassignedDisciplineStatuses(
  ticketIds: string[],
  standardTicketIds: Set<string>,
) {
  const { data: finalAssignees } = await supabase
    .from("ticket_assignees")
    .select("ticket_id, slot")
    .in("ticket_id", ticketIds);
  const haveFE = new Set<string>();
  const haveBE = new Set<string>();
  (finalAssignees ?? []).forEach((a) => {
    if (a.slot === "FE") haveFE.add(a.ticket_id);
    else if (a.slot === "BE") haveBE.add(a.ticket_id);
  });
  const resetFEIds = Array.from(standardTicketIds).filter((id) => !haveFE.has(id));
  const resetBEIds = Array.from(standardTicketIds).filter((id) => !haveBE.has(id));
  if (resetFEIds.length) {
    await supabase.from("tickets").update({ fe_status: "todo" }).in("id", resetFEIds);
  }
  if (resetBEIds.length) {
    await supabase.from("tickets").update({ be_status: "todo" }).in("id", resetBEIds);
  }
}
