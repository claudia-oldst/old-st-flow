import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

export interface TicketLite {
  id: string;
  created_at: string;
  epic_id: number | null;
  original_fe_estimate: number;
  original_be_estimate: number;
  ticket_type: string;
  is_cr: boolean;
  cr_effective_at: string | null;
  cr_fe: number;
  cr_be: number;
}
export interface ChangeLite { ticket_id: string; delta: number; created_at: string }
export interface LogLite { ticket_id: string; hours: number; logged_at: string }

export function usePortalEpicTrendData(projectId: string, includedEpics: Array<{ id: number; name: string }>) {
  const [tickets, setTickets] = useState<TicketLite[]>([]);
  const [changes, setChanges] = useState<ChangeLite[]>([]);
  const [logs, setLogs] = useState<LogLite[]>([]);
  const [projectStart, setProjectStart] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const includedIds = useMemo(() => new Set(includedEpics.map((e) => e.id)), [includedEpics]);

  useRealtimeReload(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "ticket_estimate_changes" },
          { table: "time_logs" },
        ]
      : null,
    useMemo(() => () => setTick((t) => t + 1), []),
    !!projectId,
  );

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const [{ data: proj }, { data: tk }] = await Promise.all([
        supabase.from("projects").select("start_date").eq("id", projectId).maybeSingle(),
        supabase
          .from("tickets")
          .select("id,created_at,epic_id,original_fe_estimate,original_be_estimate,ticket_type,cr_approval,cr_decided_at")
          .eq("project_id", projectId),
      ]);
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProjectStart((proj as any)?.start_date ?? null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tkRows = (tk ?? []) as any[];
      const filtered: TicketLite[] = tkRows
        .filter((t) => t.epic_id != null && includedIds.has(t.epic_id))
        .filter((t) => t.ticket_type !== "CR" || t.cr_approval === "approved")
        .map((t) => {
          const isCR = t.ticket_type === "CR";
          return {
            id: t.id,
            created_at: t.created_at,
            epic_id: t.epic_id,
            ticket_type: t.ticket_type,
            is_cr: isCR,
            cr_effective_at: isCR ? (t.cr_decided_at ?? t.created_at) : null,
            cr_fe: isCR ? Number(t.original_fe_estimate) || 0 : 0,
            cr_be: isCR ? Number(t.original_be_estimate) || 0 : 0,
            original_fe_estimate: isCR ? 0 : Number(t.original_fe_estimate) || 0,
            original_be_estimate: isCR ? 0 : Number(t.original_be_estimate) || 0,
          };
        });
      setTickets(filtered);

      const ids = filtered.map((t) => t.id);
      if (ids.length === 0) {
        setChanges([]); setLogs([]);
        return;
      }
      const CHUNK = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

      const chResults = await Promise.all(
        chunks.map((c) =>
          supabase
            .from("ticket_estimate_changes")
            .select("ticket_id,delta,created_at,status")
            .in("ticket_id", c)
            .eq("status", "approved"),
        ),
      );
      const lgResults = await Promise.all(
        chunks.map((c) =>
          supabase
            .from("time_logs")
            .select("ticket_id,hours,logged_at,discipline")
            .in("ticket_id", c)
            .in("discipline", ["FE", "BE"]),
        ),
      );
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chRows = chResults.flatMap((r) => (r.data ?? []) as any[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lgRows = lgResults.flatMap((r) => (r.data ?? []) as any[]);
      setChanges(chRows.map((c) => ({
        ticket_id: c.ticket_id,
        delta: Number(c.delta) || 0,
        created_at: c.created_at,
      })));
      setLogs(lgRows.map((l) => ({
        ticket_id: l.ticket_id,
        hours: Number(l.hours) || 0,
        logged_at: l.logged_at,
      })));
    })();
    return () => { cancelled = true; };
  }, [projectId, includedIds, tick]);

  const ticketEpic = useMemo(() => {
    const m = new Map<string, number>();
    tickets.forEach((t) => t.epic_id != null && m.set(t.id, t.epic_id));
    return m;
  }, [tickets]);

  return { tickets, changes, logs, projectStart, ticketEpic };
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}

import { format } from "date-fns";

export function buildEpicTrendSeries(args: {
  tickets: TicketLite[];
  changes: ChangeLite[];
  logs: LogLite[];
  projectStart: string | null;
  cutoffMs: number;
  ticketFilter: (id: string) => boolean;
  discounts?: Array<{ hours: number; created_at: string }>;
}) {
  const { tickets, changes, logs, projectStart, cutoffMs, ticketFilter, discounts = [] } = args;
  const relevant = tickets.filter((t) => ticketFilter(t.id));
  if (relevant.length === 0) return [];
  const firstMs = Math.min(...relevant.map((t) => new Date(t.created_at).getTime()));
  const startMs = projectStart
    ? startOfDay(new Date(projectStart)).getTime()
    : startOfDay(new Date(firstMs)).getTime();
  const end = endOfDay(new Date(cutoffMs)).getTime();
  if (end < startMs) return [];
  const dayMs = 86_400_000;
  const totalDays = Math.max(1, Math.ceil((end - startMs) / dayMs));
  const stride = Math.max(1, Math.ceil(totalDays / 80));
  const buckets: Array<{ label: string; original: number; current: number; actual: number; _t?: number }> = [];
  const ticketById = new Map(relevant.map((tk) => [tk.id, tk] as const));
  const sampleAt = (c: number) => {
    let original = 0; let deltas = 0; let actual = 0;
    relevant.forEach((tk) => {
      if (tk.is_cr) {
        const eff = tk.cr_effective_at ? new Date(tk.cr_effective_at).getTime() : null;
        if (eff != null && eff <= c) original += tk.cr_fe + tk.cr_be;
      } else {
        if (new Date(tk.created_at).getTime() > c) return;
        original += tk.original_fe_estimate + tk.original_be_estimate;
      }
    });
    changes.forEach((ch) => {
      if (!ticketFilter(ch.ticket_id)) return;
      const tk = ticketById.get(ch.ticket_id);
      if (!tk) return;
      const chMs = new Date(ch.created_at).getTime();
      const effMs = tk.is_cr && tk.cr_effective_at ? new Date(tk.cr_effective_at).getTime() : 0;
      const deltaEff = Math.max(chMs, effMs);
      if (deltaEff > c) return;
      deltas += ch.delta;
    });
    logs.forEach((l) => {
      if (!ticketFilter(l.ticket_id)) return;
      if (new Date(l.logged_at).getTime() > c) return;
      actual += l.hours;
    });
    let discounted = 0;
    discounts.forEach((d) => {
      if (new Date(d.created_at).getTime() > c) return;
      discounted += Number(d.hours) || 0;
    });
    return {
      original,
      current: Math.max(0, original + deltas - discounted),
      actual: Math.max(0, actual - discounted),
    };
  };

  for (let t = startMs; t <= end; t += stride * dayMs) {
    const s = sampleAt(t);
    buckets.push({ label: format(new Date(t), "d MMM"), ...s, _t: t });
  }
  const lastT = buckets[buckets.length - 1]?._t ?? -Infinity;
  if (lastT < end) {
    const s = sampleAt(end);
    buckets.push({ label: format(new Date(end), "d MMM"), ...s, _t: end });
  }
  return buckets;
}
