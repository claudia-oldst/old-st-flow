import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEstimateChanges } from "@/features/estimates/useEstimateChanges";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import { ALL_EPICS_KEY, NO_EPIC_KEY, endOfDay, startOfDay } from "./dateUtils";

interface TimeLogLite {
  ticket_id: string;
  hours: number;
  discipline: "FE" | "BE";
  logged_at: string;
}

export function useEstimateEvolution({
  projectId,
  asOf,
  selectedEpic,
  epics,
}: {
  projectId: string;
  asOf: Date;
  selectedEpic: string;
  epics: { id: number; epic_name: string | null }[];
}) {
  const { tickets } = useProjectTickets(projectId);
  const { changes } = useProjectEstimateChanges(projectId);
  const [logs, setLogs] = useState<TimeLogLite[]>([]);
  const [projectStart, setProjectStart] = useState<Date | null>(null);

  const loadStart = useCallback(() => {
    supabase
      .from("projects")
      .select("start_date")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        const sd = (data as any)?.start_date as string | null | undefined;
        setProjectStart(sd ? startOfDay(new Date(sd)) : null);
      });
  }, [projectId]);

  useEffect(() => {
    loadStart();
  }, [loadStart]);

  useRealtimeReload(
    [{ table: "projects", filter: `id=eq.${projectId}` }],
    loadStart,
  );

  const loadLogs = useCallback(() => {
    const ids = tickets.map((t) => t.id);
    if (ids.length === 0) {
      setLogs([]);
      return;
    }
    supabase
      .from("time_logs")
      .select("ticket_id,hours,discipline,logged_at")
      .in("ticket_id", ids)
      .in("discipline", ["FE", "BE"])
      .then(({ data }) => {
        setLogs(
          (data ?? []).map((l: any) => ({
            ticket_id: l.ticket_id,
            hours: Number(l.hours),
            discipline: l.discipline,
            logged_at: l.logged_at,
          }))
        );
      });
  }, [tickets]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useRealtimeReload([{ table: "time_logs" }], loadLogs);

  const ticketEpic = useMemo(() => {
    const m = new Map<string, number | null>();
    tickets.forEach((t) => m.set(t.id, t.epic_id));
    return m;
  }, [tickets]);

  const ticketEffectiveMs = useCallback((t: typeof tickets[number]) => {
    if (t.ticket_type === "CR") {
      if (t.cr_approval !== "approved") return Infinity;
      const d = t.cr_decided_at ?? t.created_at;
      return new Date(d).getTime();
    }
    return new Date(t.created_at).getTime();
  }, []);

  const epicSnapshots = useMemo(() => {
    const asOfMs = endOfDay(asOf).getTime();

    const groups = new Map<
      string,
      { name: string; original: number; current: number; actual: number; ticketIds: Set<string> }
    >();

    tickets.forEach((t) => {
      if (t.ticket_type === "CR" && t.cr_approval !== "approved") return;
      const effMs = ticketEffectiveMs(t);
      const key = t.epic_id != null ? `e:${t.epic_id}` : NO_EPIC_KEY;
      const name =
        t.epic_id != null
          ? epics.find((e) => e.id === t.epic_id)?.epic_name ?? `Epic ${t.epic_id}`
          : "No epic";
      if (!groups.has(key)) {
        groups.set(key, { name, original: 0, current: 0, actual: 0, ticketIds: new Set() });
      }
      const g = groups.get(key)!;
      g.ticketIds.add(t.id);
      if (effMs > asOfMs) return;
      g.original += t.original_fe_estimate + t.original_be_estimate;
    });

    const ticketEff = new Map<string, number>();
    tickets.forEach((t) => ticketEff.set(t.id, ticketEffectiveMs(t)));
    changes.forEach((c) => {
      if (c.status !== "approved") return;
      const tkEff = ticketEff.get(c.ticket_id);
      if (tkEff == null || !isFinite(tkEff)) return;
      const deltaEff = Math.max(new Date(c.created_at).getTime(), tkEff);
      if (deltaEff > asOfMs) return;
      const epicId = ticketEpic.get(c.ticket_id);
      const key = epicId != null ? `e:${epicId}` : NO_EPIC_KEY;
      const g = groups.get(key);
      if (!g) return;
      g.current += c.delta;
    });

    groups.forEach((g) => {
      g.current = g.original + g.current;
    });

    logs.forEach((l) => {
      if (new Date(l.logged_at).getTime() > asOfMs) return;
      const epicId = ticketEpic.get(l.ticket_id);
      const key = epicId != null ? `e:${epicId}` : NO_EPIC_KEY;
      const g = groups.get(key);
      if (!g) return;
      g.actual += l.hours;
    });

    return Array.from(groups.entries())
      .map(([key, v]) => ({ key, ...v }))
      .filter((g) => g.original > 0 || g.current > 0 || g.actual > 0)
      .sort((a, b) => b.current - a.current);
  }, [tickets, epics, changes, logs, ticketEpic, asOf, ticketEffectiveMs]);

  const trendData = useMemo(() => {
    if (tickets.length === 0) return [];

    const ticketFilter = (ticketId: string) => {
      if (selectedEpic === ALL_EPICS_KEY) return true;
      const epicId = ticketEpic.get(ticketId);
      if (selectedEpic === NO_EPIC_KEY) return epicId == null;
      return `e:${epicId}` === selectedEpic;
    };

    const relevantTickets = tickets.filter(
      (t) => ticketFilter(t.id) && !(t.ticket_type === "CR" && t.cr_approval !== "approved"),
    );
    if (relevantTickets.length === 0) return [];

    const ticketEffMs = new Map<string, number>();
    relevantTickets.forEach((t) => ticketEffMs.set(t.id, ticketEffectiveMs(t)));

    const firstTicketMs = Math.min(...Array.from(ticketEffMs.values()).filter((v) => isFinite(v)));
    const startMs = projectStart
      ? startOfDay(projectStart).getTime()
      : startOfDay(new Date(firstTicketMs)).getTime();
    const start = startMs;
    const end = endOfDay(asOf).getTime();
    if (end < start) return [];

    const dayMs = 86_400_000;
    const totalDays = Math.max(1, Math.ceil((end - start) / dayMs));
    const stride = Math.max(1, Math.ceil(totalDays / 120));

    const buckets: Array<{ date: number; label: string; original: number; current: number; actual: number }> = [];

    const sampleAt = (cutoff: number) => {
      let original = 0;
      let deltas = 0;
      let actual = 0;
      relevantTickets.forEach((tk) => {
        const eff = ticketEffMs.get(tk.id) ?? Infinity;
        if (eff > cutoff) return;
        original += tk.original_fe_estimate + tk.original_be_estimate;
      });
      changes.forEach((c) => {
        if (c.status !== "approved") return;
        if (!ticketFilter(c.ticket_id)) return;
        const tkEff = ticketEffMs.get(c.ticket_id);
        if (tkEff == null) return;
        const deltaEff = Math.max(new Date(c.created_at).getTime(), tkEff);
        if (deltaEff > cutoff) return;
        deltas += c.delta;
      });
      logs.forEach((l) => {
        if (new Date(l.logged_at).getTime() > cutoff) return;
        if (!ticketFilter(l.ticket_id)) return;
        actual += l.hours;
      });
      return { original, current: original + deltas, actual };
    };

    for (let t = start; t <= end; t += stride * dayMs) {
      const s = sampleAt(t);
      buckets.push({ date: t, label: format(new Date(t), "d MMM"), ...s });
    }
    if (buckets.length === 0 || buckets[buckets.length - 1].date < end) {
      const s = sampleAt(end);
      buckets.push({ date: end, label: format(new Date(end), "d MMM"), ...s });
    }

    return buckets;
  }, [tickets, changes, logs, ticketEpic, selectedEpic, asOf, projectStart, ticketEffectiveMs]);

  return { epicSnapshots, trendData };
}
