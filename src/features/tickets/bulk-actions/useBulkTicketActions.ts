import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DisciplineStatus } from "@/lib/types";

export type TicketPatch = {
  status_id?: string | null;
  project_status_override?: boolean;
  epic_id?: number | null;
  fe_status?: DisciplineStatus;
  be_status?: DisciplineStatus;
  version?: string | null;
};

/** Bulk mutations applied to the current ticket selection. */
export function useBulkTicketActions(selectedIds: string[], onClear: () => void) {
  const [busy, setBusy] = useState(false);

  const update = async (patch: TicketPatch, msg: string) => {
    setBusy(true);
    const { error } = await supabase.from("tickets").update(patch).in("id", selectedIds);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      `${msg} for ${selectedIds.length} ticket${selectedIds.length === 1 ? "" : "s"}`,
    );
  };

  const setStatus = (status_id: string | null) =>
    update({ status_id, project_status_override: status_id !== null }, "Status updated");
  const setEpic = (epic_id: number | null) => update({ epic_id }, "Epic updated");
  const setFeStatus = (fe_status: DisciplineStatus) =>
    update({ fe_status }, "FE status updated");
  const setBeStatus = (be_status: DisciplineStatus) =>
    update({ be_status }, "BE status updated");
  const setVersion = (version: string | null) => update({ version }, "Version updated");

  const doDelete = async () => {
    setBusy(true);
    const { error } = await supabase.from("tickets").delete().in("id", selectedIds);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      `Deleted ${selectedIds.length} ticket${selectedIds.length === 1 ? "" : "s"}`,
    );
    onClear();
  };

  return { busy, setStatus, setEpic, setFeStatus, setBeStatus, setVersion, doDelete };
}
