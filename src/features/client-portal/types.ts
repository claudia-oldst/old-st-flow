export interface PortalEpic {
  id: number;
  epic_name: string | null;
  total_tickets: number;
  backlog_tickets: number;
  in_progress_tickets: number;
  done_tickets: number;
  current_estimate: number;
  original_estimate: number;
  actual_hours: number;
  pmba_text: string | null;
  ai_draft: string | null;
  included: boolean | null;
}

export interface PortalTotals {
  tickets_total: number;
  tickets_backlog: number;
  tickets_in_progress: number;
  tickets_done: number;
  fe_actual: number;
  be_actual: number;
  proj_actual: number;
  fe_estimate: number;
  be_estimate: number;
  proj_estimate: number;
  fe_done: number;
  fe_in_progress: number;
  fe_todo: number;
  be_done: number;
  be_in_progress: number;
  be_todo: number;
  original_total: number;
  current_total: number;
  actual_total: number;
  cost_actual: number;
  cost_estimate: number;
}

export interface PortalProject {
  id: string;
  name: string;
  acronym: string;
  client_name: string | null;
  cutoff: string;
  rate_per_hour: number;
  summary: string | null;
  summary_updated_at: string | null;
}

export interface PortalPayload {
  project: PortalProject;
  totals: PortalTotals;
  epics: PortalEpic[];
}

export const formatGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n || 0);
