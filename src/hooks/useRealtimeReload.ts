import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeTable {
  table: string;
  filter?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
}

/**
 * Subscribe to one or more Postgres tables and call `onChange` on any event.
 * Channel auto-named (random) and cleaned up on unmount / dep change.
 *
 * Bursts of events arriving within ~50ms are coalesced into a single
 * `onChange` call. This keeps multi-row writes / multi-filter overlap from
 * triggering redundant refetches without delaying perceived realtime.
 *
 * Pass a stable `onChange` (e.g. wrap in useCallback) — otherwise the channel
 * resubscribes on every render.
 */
export function useRealtimeReload(
  tables: RealtimeTable[] | null | undefined,
  onChange: () => void,
  enabled: boolean = true,
) {
  const key = tables ? JSON.stringify(tables) : "";
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    if (!tables || tables.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        onChangeRef.current();
      }, 50);
    };

    const ch = supabase.channel(
      `rt-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    );
    tables.forEach((t) => {
      const cfg: any = {
        event: t.event ?? "*",
        schema: "public",
        table: t.table,
      };
      if (t.filter) cfg.filter = t.filter;
      ch.on("postgres_changes" as any, cfg, () => fire());
    });
    ch.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);
}
