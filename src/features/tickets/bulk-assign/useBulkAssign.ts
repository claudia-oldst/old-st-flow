import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { toast } from "sonner";
import {
  applyAssignmentDiff,
  buildAssignmentDiff,
  emptySlotMaps,
  loadBulkAssignState,
  resetUnassignedDisciplineStatuses,
  type Slot,
  type SlotJob,
  type SlotMaps,
} from "./bulkAssignOps";

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

  // existing[slot][userId] = Set of ticketIds the user is currently assigned on
  const [existing, setExisting] = useState<SlotMaps>(emptySlotMaps());

  useEffect(() => {
    if (!open) return;
    setFeUserIds(new Set());
    setBeUserIds(new Set());
    setOtherUserIds(new Set());
    setProjectUserIds(new Set());
    setExisting(emptySlotMaps());

    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      .then(({ data }) =>
        setMembers((data ?? []) as unknown as (ProjectMember & { member: TeamMember })[]),
      );

    if (!ticketIds.length) {
      setProjTicketIds(new Set());
      setStandardTicketIds(new Set());
      return;
    }

    (async () => {
      const { proj, std, existing: next } = await loadBulkAssignState(ticketIds);
      setProjTicketIds(proj);
      setStandardTicketIds(std);
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
  // Proj tickets: anyone on the project. Project-contributor slot: non-dev roles only.
  const otherEligible = members;
  const contributorEligible = members.filter(
    (m) => m.role !== "Frontend" && m.role !== "Backend" && m.role !== "Fullstack",
  );

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
    const applicableSize = slot === "Proj" ? projTicketIds.size : standardTicketIds.size;
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
    [existing, projTicketIds, standardTicketIds],
  );

  const slotJobs = useMemo<SlotJob[]>(
    () => [
      { slot: "FE", selected: feUserIds, applicable: standardTicketIds },
      { slot: "BE", selected: beUserIds, applicable: standardTicketIds },
      { slot: "OtherStd", selected: otherUserIds, applicable: standardTicketIds },
      { slot: "Proj", selected: projectUserIds, applicable: projTicketIds },
    ],
    [feUserIds, beUserIds, otherUserIds, projectUserIds, standardTicketIds, projTicketIds],
  );

  const diff = useMemo(() => {
    const { inserts, deletes } = buildAssignmentDiff(slotJobs, existing);
    return { added: inserts.length, removed: deletes.reduce((n, d) => n + d.ticket_ids.length, 0) };
  }, [slotJobs, existing]);

  const handleSave = async () => {
    if (ticketIds.length === 0) return;
    if (diff.added === 0 && diff.removed === 0) return toast.info("No changes to save");
    setBusy(true);

    const { inserts, deletes } = buildAssignmentDiff(slotJobs, existing);
    const error = await applyAssignmentDiff(inserts, deletes);
    if (error) {
      toast.error(error);
      setBusy(false);
      return;
    }

    await resetUnassignedDisciplineStatuses(ticketIds, standardTicketIds);

    setBusy(false);
    toast.success(
      `Updated assignees on ${ticketIds.length} ticket${ticketIds.length === 1 ? "" : "s"}`,
    );
    onSaved();
    onClose();
  };

  return {
    feEligible,
    beEligible,
    otherEligible,
    contributorEligible,
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
