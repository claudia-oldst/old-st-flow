/**
 * Shared data shapes used by the estimate-trend module (used by both the
 * Project Health "Estimate evolution" panel and the Client Portal trend chart).
 */

export interface TicketLite {
  id: string;
  created_at: string;
  epic_id: number | null;
  ticket_type: string;
  original_fe_estimate: number;
  original_be_estimate: number;
  /** True when ticket_type === "CR" AND the CR is approved. */
  is_cr: boolean;
  /** For approved CRs: cr_decided_at ?? created_at. Null for non-CRs. */
  cr_effective_at: string | null;
}

export interface ChangeLite {
  ticket_id: string;
  delta: number;
  created_at: string;
}

export interface LogLite {
  ticket_id: string;
  hours: number;
  logged_at: string;
}

export interface DiscountLite {
  hours: number;
  created_at: string;
  /** Optional — only used when callers want per-epic filtering before passing in. */
  epic_id?: number;
}

export interface TrendBucket {
  label: string;
  original: number;
  current: number;
  actual: number;
  /** Epoch ms for the sample; used for in-memory filtering/debugging. */
  _t?: number;
}
