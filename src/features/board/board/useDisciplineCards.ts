import { useMemo } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DisciplineStatus } from "@/lib/types";
import type { Status } from "@/features/statuses/useStatuses";
import {
  CATEGORY_TO_DISCIPLINE,
  DISCIPLINE_STATUSES,
  DisciplineCard,
} from "./constants";

export function useDisciplineCards({
  visible,
  user,
  showAll,
  role,
  statuses,
}: {
  visible: TicketRow[];
  user: { id: string } | null;
  showAll: boolean;
  role: string | null;
  statuses: Status[];
}) {
  const statusCategoryById = useMemo(() => {
    const m: Record<string, string> = {};
    statuses.forEach((s) => (m[s.id] = s.category));
    return m;
  }, [statuses]);

  const disciplineCards: DisciplineCard[] = useMemo(() => {
    if (!user && !showAll) return [];
    const showFE = role !== "Backend";
    const showBE = role !== "Frontend";
    const showProject = role !== "Frontend" && role !== "Backend";
    const out: DisciplineCard[] = [];
    visible.forEach((t) => {
      if (t.ticket_type === "Proj") {
        const hasProject = t.assignees.some((a) => a.slot === "Project");
        if (!hasProject) return;
        const cat = t.status_id ? statusCategoryById[t.status_id] : undefined;
        const dStatus: DisciplineStatus = (cat ? CATEGORY_TO_DISCIPLINE[cat] : undefined) ?? "todo";
        if (showAll) {
          if (showProject) out.push({ ticket: t, slot: "Project", status: dStatus });
        } else {
          const mine = t.assignees.some((a) => a.user_id === user!.id && a.slot === "Project");
          if (mine) out.push({ ticket: t, slot: "Project", status: dStatus });
        }
        return;
      }
      const hasFE = t.assignees.some((a) => a.slot === "FE");
      const hasBE = t.assignees.some((a) => a.slot === "BE");
      if (showAll) {
        if (showFE && hasFE) out.push({ ticket: t, slot: "FE", status: t.fe_status });
        if (showBE && hasBE) out.push({ ticket: t, slot: "BE", status: t.be_status });
      } else {
        const slots = new Set(
          t.assignees
            .filter((a) => a.user_id === user!.id && (a.slot === "FE" || a.slot === "BE"))
            .map((a) => a.slot as "FE" | "BE")
        );
        slots.forEach((slot) => {
          out.push({
            ticket: t,
            slot,
            status: slot === "FE" ? t.fe_status : t.be_status,
          });
        });
      }
    });
    return out;
  }, [visible, user, showAll, role, statusCategoryById]);

  const byDisciplineStatus = useMemo(() => {
    const map: Record<DisciplineStatus, DisciplineCard[]> = {
      todo: [],
      in_progress: [],
      for_integration: [],
      done: [],
    };
    disciplineCards.forEach((c) => map[c.status].push(c));
    return map;
  }, [disciplineCards]);

  return { statusCategoryById, disciplineCards, byDisciplineStatus, disciplineColumns: DISCIPLINE_STATUSES };
}
