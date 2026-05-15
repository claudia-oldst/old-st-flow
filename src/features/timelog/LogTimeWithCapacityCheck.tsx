import { useState } from "react";
import { LogTimeModal } from "@/features/timelog/LogTimeModal";
import { RequestMoreTimeDialog, type AdjustSlot } from "@/features/tickets/RequestMoreTimeDialog";
import { useTicketCapacity, capacityFor } from "@/features/timelog/useTicketCapacity";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import { formatHours } from "@/lib/utils";

/**
 * Resolves the discipline a quick-start should default to for the current
 * user. Mirrors useLogTime's defaultDiscipline logic but standalone so we can
 * make the over-capacity check before opening any modal.
 */
function resolveDefaultDiscipline(
  ticket: TicketRow,
  role: ProjectRole | null,
  userId: string | undefined,
): LogDiscipline {
  const isProj = ticket.ticket_type === "Proj";
  const mySlots = userId
    ? ticket.assignees.filter((a) => a.user_id === userId).map((a) => a.slot)
    : [];
  const onlyProjectSlot =
    mySlots.length > 0 && mySlots.every((s) => s === "Project");

  if (isProj) return "Project";
  if (onlyProjectSlot) return "Project";
  if (role === "Frontend") return "FE";
  if (role === "Backend") return "BE";
  if (mySlots.includes("FE") && !mySlots.includes("BE")) return "FE";
  if (mySlots.includes("BE") && !mySlots.includes("FE")) return "BE";
  if (role === "Fullstack") return "FE";
  return "Project";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow;
  role: ProjectRole | null;
  userId: string | undefined;
}

/**
 * Wraps LogTimeModal with the over-estimate guard:
 * If the user is already at/over their available capacity for the resolved
 * default discipline on this ticket, opens RequestMoreTimeDialog first and
 * chains into LogTimeModal once the estimate has been adjusted.
 */
export function LogTimeWithCapacityCheck({
  open,
  onOpenChange,
  ticket,
  role,
  userId,
}: Props) {
  const { map, refetch } = useTicketCapacity([ticket], open);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  // Decide what to show whenever the parent toggles `open` -> true.
  const discipline = resolveDefaultDiscipline(ticket, role, userId);
  const cap = capacityFor(map[ticket.id], discipline);

  // Sync from parent open: when parent opens us, route to the right modal.
  // We use a small effect-less pattern by tracking "open" against local state.
  if (open && !logOpen && !adjustOpen) {
    if (cap.isOver) {
      setAdjustOpen(true);
    } else {
      setLogOpen(true);
    }
  }

  const closeAll = () => {
    setLogOpen(false);
    setAdjustOpen(false);
    onOpenChange(false);
  };

  const adjustSlot: AdjustSlot =
    discipline === "Project" ? "Proj" : (discipline as "FE" | "BE");

  return (
    <>
      {logOpen && (
        <LogTimeModal
          open={logOpen}
          onOpenChange={(v) => {
            if (!v) closeAll();
            else setLogOpen(true);
          }}
          ticket={ticket}
          role={role}
        />
      )}

      {adjustOpen && (
        <RequestMoreTimeDialog
          open={adjustOpen}
          onOpenChange={(v) => {
            if (!v) closeAll();
            else setAdjustOpen(true);
          }}
          ticketId={ticket.id}
          currentFE={ticket.current_fe_estimate}
          currentBE={ticket.current_be_estimate}
          actualFE={ticket.actual_frontend_hours}
          actualBE={ticket.actual_backend_hours}
          currentProj={ticket.current_project_estimate}
          actualProj={ticket.actual_project_hours}
          allowedSlots={[adjustSlot]}
          defaultSlot={adjustSlot}
          helperText={`Used ${formatHours(cap.actual)} of ${formatHours(cap.available)} on this ticket. Add more hours to log against it.`}
          onSaved={() => {
            // Adjust dialog already closed itself; chain into Log Time.
            setAdjustOpen(false);
            refetch();
            setLogOpen(true);
          }}
        />
      )}
    </>
  );
}
