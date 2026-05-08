import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { PortalChangeRequests } from "../PortalChangeRequests";

export function PreviewChangeRequests({ projectId }: { projectId: string }) {
  const { tickets, reload } = useProjectTickets(projectId);
  const { epics } = useProjectEpics(projectId);
  const [acronym, setAcronym] = useState("?");

  useEffect(() => {
    supabase
      .from("projects")
      .select("acronym")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => setAcronym(data?.acronym ?? "?"));
  }, [projectId]);

  const baseline = useMemo(() => tickets.filter((t) => t.ticket_type !== "CR"), [tickets]);
  const crs = useMemo(() => tickets.filter((t) => t.ticket_type === "CR"), [tickets]);

  async function handleApprove(ticketId: string) {
    const { error } = await supabase
      .from("tickets")
      .update({
        cr_approval: "approved",
        cr_decided_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("cr_approval", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Change request approved");
    reload();
  }

  return (
    <PortalChangeRequests
      acronym={acronym}
      epics={epics.map((e) => ({ id: e.id, epic_name: e.epic_name }))}
      baselineTickets={baseline as never}
      crTickets={crs as never}
      onApprove={handleApprove}
    />
  );
}
