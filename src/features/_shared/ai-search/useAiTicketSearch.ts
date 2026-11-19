import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

export interface AiResult { query: string; ids: Set<string> }

/** One-shot AI search: must be armed for each search and disarms after running. */
export function useAiTicketSearch() {
  const [armed, setArmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);

  const run = useCallback(async (query: string, candidates: TicketRow[]) => {
    const q = query.trim();
    if (q.length < 2) { toast.message("Type what you're looking for first"); return null; }
    if (!candidates.length) { toast.message("No tickets match the current filters"); setArmed(false); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-ticket-search", {
        body: {
          query: q,
          tickets: candidates.slice(0, 2000).map((t) => ({
            id: t.id, ref: t.formatted_id ?? null, title: t.title, epic: t.epic_name ?? null, type: t.ticket_type ?? null,
          })),
        },
      });
      if (error || data?.error) {
        let msg = data?.error as string | undefined;
        try { msg ??= (await (error as any)?.context?.json?.())?.error; } catch { /* ignore */ }
        toast.error(msg ?? "AI search failed");
        return null;
      }
      const next = { query: q, ids: new Set<string>(data?.ids ?? []) };
      setResult(next);
      return next;
    } finally {
      setLoading(false);
      setArmed(false);
    }
  }, []);

  const clear = useCallback(() => setResult(null), []);
  return { armed, setArmed, loading, result, run, clear };
}

export type AiTicketSearch = ReturnType<typeof useAiTicketSearch>;
