import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PortalTotals {
  tickets_total: number;
  tickets_done: number;
  fe_actual: number;
  be_actual: number;
  proj_actual: number;
  fe_estimate: number;
  be_estimate: number;
  proj_estimate: number;
  original_total: number;
  current_total: number;
  actual_total: number;
}

export interface PortalEpic {
  id: number;
  epic_name: string | null;
  total_tickets: number;
  done_tickets: number;
  current_estimate: number;
  original_estimate: number;
}

export interface PortalChange {
  id: string;
  ticket_id: string;
  ticket_formatted_id: string;
  discipline: "FE" | "BE" | "Project";
  previous_hours: number;
  new_hours: number;
  delta: number;
  reason: string | null;
  occurred_at: string;
}

export interface PortalProject {
  id: string;
  name: string;
  acronym: string;
  client_name: string | null;
  cutoff: string;
  summary: string | null;
  summary_updated_at: string | null;
}

export interface PortalPayload {
  project: PortalProject;
  totals: PortalTotals;
  epics: PortalEpic[];
  changes: PortalChange[];
}

export function useClientPortalData(hash: string | undefined) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hash) {
      setLoading(false);
      setError("Missing portal link");
      return;
    }
    setLoading(true);
    setError(null);
    const { data: rpc, error: rpcErr } = await supabase.rpc("get_client_portal", {
      _hash: hash,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setData(null);
    } else if (!rpc) {
      setError("This portal is unavailable.");
      setData(null);
    } else {
      // Cast numerics
      const payload = rpc as unknown as PortalPayload;
      const num = (n: any) => Number(n ?? 0);
      payload.totals = {
        tickets_total: Number(payload.totals.tickets_total),
        tickets_done: Number(payload.totals.tickets_done),
        fe_actual: num(payload.totals.fe_actual),
        be_actual: num(payload.totals.be_actual),
        proj_actual: num(payload.totals.proj_actual),
        fe_estimate: num(payload.totals.fe_estimate),
        be_estimate: num(payload.totals.be_estimate),
        proj_estimate: num(payload.totals.proj_estimate),
        original_total: num(payload.totals.original_total),
        current_total: num(payload.totals.current_total),
        actual_total: num(payload.totals.actual_total),
      };
      payload.epics = (payload.epics ?? []).map((e) => ({
        ...e,
        current_estimate: num(e.current_estimate),
        original_estimate: num(e.original_estimate),
      }));
      payload.changes = (payload.changes ?? []).map((c) => ({
        ...c,
        previous_hours: num(c.previous_hours),
        new_hours: num(c.new_hours),
        delta: num(c.delta),
      }));
      setData(payload);
    }
    setLoading(false);
  }, [hash]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
