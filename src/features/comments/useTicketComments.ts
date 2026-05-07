import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import type { CommentRow, CommentThreadNode, CommentAttachment } from "./types";

export function useTicketComments(ticketId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["ticketComments", ticketId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!ticketId,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data } = await supabase
        .from("ticket_comments")
        .select("*, author:team_members(*)")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      return ((data as any[]) ?? []).map((r) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        user_id: r.user_id,
        parent_id: r.parent_id,
        body: r.body ?? "",
        attachments: (r.attachments ?? []) as CommentAttachment[],
        edited_at: r.edited_at,
        created_at: r.created_at,
        author: r.author ?? null,
      }));
    },
  });

  useRealtimeInvalidate(
    ticketId
      ? [{ table: "ticket_comments", filter: `ticket_id=eq.${ticketId}` }]
      : null,
    queryKey,
    !!ticketId,
  );

  const rows = query.data ?? [];
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

  return {
    threads,
    count: rows.length,
    loading: query.isPending && !!ticketId,
    reload: () => qc.invalidateQueries({ queryKey }),
  };
}
