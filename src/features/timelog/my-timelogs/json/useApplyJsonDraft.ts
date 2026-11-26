import { useEffect, useRef } from "react";
import type { useInlineLogDraft } from "../useInlineLogDraft";
import { matchProject, matchTicket, type JsonLogDraft } from "./parseTimeLogJson";

type Draft = ReturnType<typeof useInlineLogDraft>;

/** Prefill an inline log row once from a JSON draft, best-matching project and ticket as lists load. */
export function useApplyJsonDraft(
  d: Draft,
  initial: JsonLogDraft | undefined,
  projects: Array<{ id: string; name: string; acronym: string }>,
  tickets: Array<{ id: string; formatted_id: string; title: string; ticket_type: string }>,
) {
  const done = useRef({ fields: false, project: false, ticket: false });

  useEffect(() => {
    if (!initial || done.current.fields) return;
    done.current.fields = true;
    if (initial.note) d.setNote(initial.note);
    if (initial.date) d.setDate(initial.date);
    if (initial.startTime) d.setStartTime(initial.startTime);
    if (initial.durH !== undefined) d.setDurH(initial.durH);
    if (initial.durM !== undefined) d.setDurM(initial.durM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (!initial || done.current.project || projects.length === 0) return;
    done.current.project = true;
    const p = matchProject(initial.project, projects);
    if (p) d.setProjectId(p.id);
    else done.current.ticket = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, projects]);

  useEffect(() => {
    if (!initial || done.current.ticket || !d.projectId || tickets.length === 0) return;
    done.current.ticket = true;
    const t = matchTicket(initial.ticket, tickets);
    if (t) d.toggleTicket(t.id, t.ticket_type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, d.projectId, tickets]);
}
