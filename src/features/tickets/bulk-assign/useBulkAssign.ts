import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { toast } from "sonner";

type Slot = "FE" | "BE" | "OtherStd" | "Proj";

const slotColumnFor = (s: Slot): "FE" | "BE" | "Project" =>
  s === "FE" ? "FE" : s === "BE" ? "BE" : "Project";

export function useBulkAssign({
  open,
  projectId,
  ticketIds,
  onSaved,
  onClose,
}: {
  open: boolean;
  projectId: string;
  ticketIds: string[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [feUserIds, setFeUserIds] = useState<Set<string>>(new Set());
  const [beUserIds, setBeUserIds] = useState<Set<string>>(new Set());
  const [otherUserIds, setOtherUserIds] = useState<Set<string>>(new Set());
  const [projectUserIds, setProjectUserIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [projTicketIds, setProjTicketIds] = useState<Set<string>>(new Set());
  const [standardTicketIds, setStandardTicketIds] = useState<Set<string>>(new Set());

  // existing[slot][userId] = Set of ticketIds the user is currently assigned on (within applicable set)
  const [existing, setExisting] = useState<Record<Slot, Map<string, Set<string>>>>({
    FE: new Map(),
    BE: new Map(),
    OtherStd: new Map(),
    Proj: new Map(),
  });

  useEffect(() => {
    if (!open) return;
    setFeUserIds(new Set());
    setBeUserIds(new Set());
    setOtherUserIds(new Set());
    setProjectUserIds(new Set());
    setExisting({ FE: new Map(), BE: new Map(), OtherStd: new Map(), Proj: new Map() });

    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      .then(({ data }) =>
        setMembers(((data ?? []) as unknown) as (ProjectMember & { member: TeamMember })[])
      );

    if (!ticketIds.length) {
      setProjTicketIds(new Set());
      setStandardTicketIds(new Set());
      return;
    }

    (async () => {
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
      setProjTicketIds(proj);
      setStandardTicketIds(std);

      const { data: assigneeRows } = await supabase
        .from("ticket_assignees")
        .select("ticket_id, user_id, slot")
        .in("ticket_id", ticketIds);

      const next: Record<Slot, Map<string, Set<string>>> = {
        FE: new Map(),
        BE: new Map(),
        OtherStd: new Map(),
        Proj: new Map(),
      };
      (assigneeRows ?? []).forEach(
        (r: { ticket_id: string; user_id: string; slot: "FE" | "BE" | "Project" }) => {
          let bucket: Slot;
          if (r.slot === "FE") bucket = "FE";
          else if (r.slot === "BE") bucket = "BE";
          else bucket = proj.has(r.ticket_id) ? "Proj" : "OtherStd";
          const map = next[bucket];
          const set = map.get(r.user_id) ?? new Set<string>();
          set.add(r.ticket_id);
          map.set(r.user_id, set);
        }
      );
      setExisting(next);

      // Pre-select any user already assigned on at least one applicable ticket.
      setFeUserIds(new Set(next.FE.keys()));
      setBeUserIds(new Set(next.BE.keys()));
      setOtherUserIds(new Set(next.OtherStd.keys()));
      setProjectUserIds(new Set(next.Proj.keys()));
    })();
  }, [open, projectId, ticketIds]);

  const feEligible = members.filter((m) => m.role === "Frontend" || m.role === "Fullstack");
  const beEligible = members.filter((m) => m.role === "Backend" || m.role === "Fullstack");
  const otherEligible = members;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const hasProj = projTicketIds.size > 0;
  const hasStandard = standardTicketIds.size > 0;

  // Helpers to compute partial / full for chip rendering.
  const partialFor = (slot: Slot): Set<string> => {
    const applicableSize =
      slot === "Proj" ? projTicketIds.size : standardTicketIds.size;
    const out = new Set<string>();
    existing[slot].forEach((tids, uid) => {
      if (tids.size > 0 && tids.size < applicableSize) out.add(uid);
    });
    return out;
  };

  const partial = useMemo(
    () => ({
      FE: partialFor("FE"),
      BE: partialFor("BE"),
      OtherStd: partialFor("OtherStd"),
      Proj: partialFor("Proj"),
    }),
    [existing, projTicketIds, standardTicketIds]
  );

  // Diff summary
  const diff = useMemo(() => {
    let added = 0;
    let removed = 0;
    const slotsStd: { slot: Slot; selected: Set<string> }[] = [
      { slot: "FE", selected: feUserIds },
      { slot: "BE", selected: beUserIds },
      { slot: "OtherStd", selected: otherUserIds },
    ];
    const slotsProj: { slot: Slot; selected: Set<string> }[] = [
      { slot: "Proj", selected: projectUserIds },
    ];
    const all = [...slotsStd, ...slotsProj];
    for (const { slot, selected } of all) {
      const applicable = slot === "Proj" ? projTicketIds : standardTicketIds;
      const existingMap = existing[slot];
      // For each selected user → inserts for applicable - existing
      selected.forEach((uid) => {
        const have = existingMap.get(uid) ?? new Set<string>();
        applicable.forEach((tid) => {
          if (!have.has(tid)) added++;
        });
      });
      // For each previously-assigned user not in selected → removals
      existingMap.forEach((tids, uid) => {
        if (!selected.has(uid)) removed += tids.size;
      });
    }
    return { added, removed };
  }, [feUserIds, beUserIds, otherUserIds, projectUserIds, existing, projTicketIds, standardTicketIds]);

  const handleSave = async () => {
    if (ticketIds.length === 0) return;
    if (diff.added === 0 && diff.removed === 0) {
      return toast.info("No changes to save");
    }
    setBusy(true);

    const slotJobs: { slot: Slot; selected: Set<string>; applicable: Set<string> }[] = [
      { slot: "FE", selected: feUserIds, applicable: standardTicketIds },
      { slot: "BE", selected: beUserIds, applicable: standardTicketIds },
      { slot: "OtherStd", selected: otherUserIds, applicable: standardTicketIds },
      { slot: "Proj", selected: projectUserIds, applicable: projTicketIds },
    ];

    const inserts: { ticket_id: string; user_id: string; slot: "FE" | "BE" | "Project" }[] = [];
    const deletes: { slot: Slot; user_id: string; ticket_ids: string[] }[] = [];

    for (const { slot, selected, applicable } of slotJobs) {
      const slotCol = slotColumnFor(slot);
      const existingMap = existing[slot];

      selected.forEach((uid) => {
        const have = existingMap.get(uid) ?? new Set<string>();
        applicable.forEach((tid) => {
          if (!have.has(tid)) inserts.push({ ticket_id: tid, user_id: uid, slot: slotCol });
        });
      });

      existingMap.forEach((tids, uid) => {
        if (!selected.has(uid)) {
          deletes.push({ slot, user_id: uid, ticket_ids: Array.from(tids) });
        }
      });
    }

    if (inserts.length) {
      const { error } = await supabase.from("ticket_assignees").insert(inserts);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    }

    for (const d of deletes) {
      if (!d.ticket_ids.length) continue;
      const slotCol = slotColumnFor(d.slot);
      const { error } = await supabase
        .from("ticket_assignees")
        .delete()
        .eq("user_id", d.user_id)
        .eq("slot", slotCol)
        .in("ticket_id", d.ticket_ids);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    }

    // Reset FE/BE status to "todo" on any ticket left without an assignee in that slot.
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

    setBusy(false);
    toast.success(
      `Updated assignees on ${ticketIds.length} ticket${ticketIds.length === 1 ? "" : "s"}`
    );
    onSaved();
    onClose();
  };

  return {
    feEligible,
    beEligible,
    otherEligible,
    feUserIds,
    setFeUserIds,
    beUserIds,
    setBeUserIds,
    otherUserIds,
    setOtherUserIds,
    projectUserIds,
    setProjectUserIds,
    toggle,
    busy,
    hasProj,
    hasStandard,
    partial,
    diff,
    handleSave,
  };
}
