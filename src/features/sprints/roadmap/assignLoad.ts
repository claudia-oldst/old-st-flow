import { formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Commitment, SprintLite } from "./cellRules";
import { hoursFor, type SprintTotals } from "./sprintTotals";

/** Chip label for a person's working-sprint load, previewing this ticket's change. */
export function assignLoad(args: {
  ticket: TicketRow;
  sprint: SprintLite;
  closed: boolean;
  totals: SprintTotals | undefined;
  cap: number;
  commits: Commitment[];
  plannedId: { fe: string | null; be: string | null } | undefined;
  userId: string;
  slot: "FE" | "BE";
  selected: boolean;
}) {
  const { ticket: t, sprint, slot, userId } = args;
  const l = args.totals?.perDev.get(userId)?.[slot];
  const base = (l?.committed ?? 0) + (l?.planned ?? 0);
  const inSprint =
    args.commits.some((c) => c.sprint_id === sprint.id && c.discipline === slot) ||
    (slot === "FE" ? args.plannedId?.fe : args.plannedId?.be) === sprint.id;
  const h = inSprint ? hoursFor(t, slot, args.closed) : 0;
  const was = t.assignees.some((a) => a.user_id === userId && a.slot === slot);
  const after = base - (was ? h : 0) + (args.selected ? h : 0);
  const fmt = (n: number) => formatHours(n).replace(/h$/, "");
  const label = after === base ? `${fmt(base)} / ${formatHours(args.cap)}` : `${fmt(base)} → ${fmt(after)} / ${formatHours(args.cap)}`;
  return { label, over: args.cap > 0 && after > args.cap };
}
