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

/** Pill colour classes per status — reuses semantic tokens / tailwind palette. */
export const LIFECYCLE_PILL: Record<LifecycleStatus, string> = {
  "Pre-live": "bg-white/5 text-dim ring-white/10",
  Confirmed: "bg-white/5 text-dim ring-white/10",
  Definition: "bg-blue-500/15 text-blue-300 ring-blue-400/20",
  "In Progress": "bg-primary/15 text-primary ring-primary/30",
  "Bug-Fixing": "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Monitor: "bg-brand-gold/15 text-brand-gold ring-brand-gold/30",
  Completed: "bg-health-good/15 text-health-good ring-health-good/30",
  "On Hold": "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  "Closed Lost": "bg-health-bad/15 text-health-bad ring-health-bad/30",
};

/** A small dot in the status colour, for dropdown options. */
export const LIFECYCLE_DOT: Record<LifecycleStatus, string> = {
  "Pre-live": "bg-dim",
  Confirmed: "bg-dim",
  Definition: "bg-blue-400",
  "In Progress": "bg-primary",
  "Bug-Fixing": "bg-amber-400",
  Monitor: "bg-brand-gold",
  Completed: "bg-health-good",
  "On Hold": "bg-amber-400",
  "Closed Lost": "bg-health-bad",
};

/** Fields each status requires before it can be saved. */
export const REQUIRED_FIELDS: Record<LifecycleStatus, (keyof LifecycleDates)[]> = {
  "Pre-live": [],
  Confirmed: [],
  Definition: ["start_date"],
  "In Progress": ["development_start_date"],
  "Bug-Fixing": ["handover_date", "closing_window_date"],
  Monitor: [],
  Completed: [],
  "On Hold": ["pause_date", "pause_reason"],
  "Closed Lost": ["closed_date", "closed_reason"],
};

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
    case "Bug-Fixing":
      return fmt(d.handover_date) ? `Handover ${fmt(d.handover_date)}` : null;
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
