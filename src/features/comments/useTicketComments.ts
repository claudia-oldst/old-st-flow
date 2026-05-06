import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import type { CommentRow, CommentThreadNode, CommentAttachment } from "./types";

export function useTicketComments(ticketId: string | undefined) {
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(!!ticketId);

  const load = useCallback(async () => {
    if (!ticketId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("ticket_comments")
      .select("*, author:team_members(*)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setRows(
      ((data as any[]) ?? []).map((r) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        user_id: r.user_id,
        parent_id: r.parent_id,
        body: r.body ?? "",
        attachments: (r.attachments ?? []) as CommentAttachment[],
        edited_at: r.edited_at,
        created_at: r.created_at,
        author: r.author ?? null,
      }))
    );
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    ticketId
      ? [{ table: "ticket_comments", filter: `ticket_id=eq.${ticketId}` }]
      : null,
    load,
    !!ticketId
  );

  const threads = useMemo<CommentThreadNode[]>(() => {
    const parents = rows.filter((r) => !r.parent_id);
    const repliesByParent = new Map<string, CommentRow[]>();
    rows
      .filter((r) => r.parent_id)
      .forEach((r) => {
        const arr = repliesByParent.get(r.parent_id!) ?? [];
        arr.push(r);
        repliesByParent.set(r.parent_id!, arr);
      });
    return parents.map((p) => ({ ...p, replies: repliesByParent.get(p.id) ?? [] }));
  }, [rows]);

  return { threads, count: rows.length, loading, reload: load };
}
