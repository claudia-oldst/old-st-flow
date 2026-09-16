import type { Database } from "@/integrations/supabase/types";

export type LifecycleStatus = Database["public"]["Enums"]["project_lifecycle_status"];

export const LIFECYCLE_STATUSES: LifecycleStatus[] = [
  "Pre-live",
  "Confirmed",
  "Definition",
  "In Progress",
  "Bug-Fixing",
  "Monitor",
  "Completed",
  "On Hold",
  "Closed Lost",
];

/** Pill colour classes per status — each status a distinct colour. */
export const LIFECYCLE_PILL: Record<LifecycleStatus, string> = {
  "Pre-live": "bg-slate-500/15 text-slate-300 ring-slate-400/20",
  Confirmed: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  Definition: "bg-blue-500/15 text-blue-300 ring-blue-400/20",
  "In Progress": "bg-primary/15 text-primary ring-primary/30",
  "Bug-Fixing": "bg-orange-500/15 text-orange-300 ring-orange-400/20",
  Monitor: "bg-health-good/15 text-health-good ring-health-good/30",
  Completed: "bg-brand-gold/15 text-brand-gold ring-brand-gold/30",
  "On Hold": "bg-violet-500/15 text-violet-300 ring-violet-400/20",
  "Closed Lost": "bg-stone-500/15 text-stone-300 ring-stone-400/20",
};

/** A small dot in the status colour, for dropdown options. */
export const LIFECYCLE_DOT: Record<LifecycleStatus, string> = {
  "Pre-live": "bg-slate-400",
  Confirmed: "bg-sky-400",
  Definition: "bg-blue-400",
  "In Progress": "bg-primary",
  "Bug-Fixing": "bg-orange-400",
  Monitor: "bg-health-good",
  Completed: "bg-brand-gold",
  "On Hold": "bg-violet-400",
  "Closed Lost": "bg-stone-400",
};

/** Always required, whatever the status. */
const ALWAYS_REQUIRED: (keyof LifecycleDates)[] = ["start_date", "development_start_date"];

/** Fields each status requires before it can be saved. */
export const REQUIRED_FIELDS: Record<LifecycleStatus, (keyof LifecycleDates)[]> = {
  "Pre-live": [],
  Confirmed: [...ALWAYS_REQUIRED],
  Definition: [...ALWAYS_REQUIRED],
  "In Progress": [...ALWAYS_REQUIRED],
  "Bug-Fixing": [...ALWAYS_REQUIRED, "handover_date", "closing_window_date"],
  Monitor: [...ALWAYS_REQUIRED],
  Completed: [...ALWAYS_REQUIRED],
  "On Hold": [...ALWAYS_REQUIRED, "pause_date", "pause_reason"],
  "Closed Lost": [...ALWAYS_REQUIRED, "closed_date", "closed_reason"],
};

/** Fields shown on the Timeline tab for each status, in display order. */
export const VISIBLE_FIELDS: Record<LifecycleStatus, (keyof LifecycleDates)[]> = {
  "Pre-live": [],
  Confirmed: [...ALWAYS_REQUIRED],
  Definition: [...ALWAYS_REQUIRED],
  "In Progress": [...ALWAYS_REQUIRED],
  "Bug-Fixing": [...ALWAYS_REQUIRED, "handover_date", "closing_window_date"],
  Monitor: [...ALWAYS_REQUIRED, "handover_date", "closing_window_date"],
  Completed: [...ALWAYS_REQUIRED],
  "On Hold": [...ALWAYS_REQUIRED, "pause_date", "pause_reason"],
  "Closed Lost": [...ALWAYS_REQUIRED, "closed_date", "closed_reason"],
};

/** Reason fields render as textareas rather than date inputs. */
export const REASON_FIELD_SET = new Set<keyof LifecycleDates>(["pause_reason", "closed_reason"]);

/** All editable date / reason fields on the timeline, in display order. */
export interface LifecycleDates {
  start_date: string | null;
  development_start_date: string | null;
  handover_date: string | null;
  closing_window_date: string | null;
  pause_date: string | null;
  pause_reason: string | null;
  closed_date: string | null;
  closed_reason: string | null;
}

export const LIFECYCLE_FIELD_LABELS: Record<keyof LifecycleDates, string> = {
  start_date: "Project start date",
  development_start_date: "Development start date",
  handover_date: "Handover date",
  closing_window_date: "Closing window date",
  pause_date: "Pause date",
  pause_reason: "Pause reason",
  closed_date: "Closed date",
  closed_reason: "Closed reason",
};

/** A short, single-date descriptor for the project card (no reasons). */
export function lifecycleCardDate(
  status: LifecycleStatus,
  d: LifecycleDates,
): string | null {
  const fmt = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };
  switch (status) {
    case "Definition":
      return fmt(d.start_date) ? `Started ${fmt(d.start_date)}` : null;
    case "In Progress":
      return fmt(d.development_start_date) ? `Dev started ${fmt(d.development_start_date)}` : null;
    case "Bug-Fixing": {
      const parts: string[] = [];
      if (fmt(d.handover_date)) parts.push(`Handover ${fmt(d.handover_date)}`);
      if (fmt(d.closing_window_date)) parts.push(`Closes ${fmt(d.closing_window_date)}`);
      return parts.length ? parts.join(" · ") : null;
    }
    case "Monitor":
      return fmt(d.handover_date) ? `Handover ${fmt(d.handover_date)}` : null;
    case "On Hold":
      return fmt(d.pause_date) ? `Paused ${fmt(d.pause_date)}` : null;
    case "Closed Lost":
      return fmt(d.closed_date) ? `Closed ${fmt(d.closed_date)}` : null;
    default:
      return null;
  }
}

/**
 * Returns the first missing required field for a status, or null if all are
 * present. Used to block the save.
 */
export function missingRequiredField(
  status: LifecycleStatus,
  d: Partial<LifecycleDates>,
): keyof LifecycleDates | null {
  for (const field of REQUIRED_FIELDS[status]) {
    const v = d[field];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
      return field;
    }
  }
  return null;
}
