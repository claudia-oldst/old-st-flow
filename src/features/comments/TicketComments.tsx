import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { MessageSquare } from "lucide-react";
import { useTicketComments } from "./useTicketComments";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";

interface Props {
  ticketId: string;
  projectId: string;
}

export function TicketComments({ ticketId, projectId }: Props) {
  const user = useCurrentUser((s) => s.user);
  const { threads, count, loading, reload } = useTicketComments(ticketId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    const sig = threads
      .flatMap((t) => [t.id, ...t.replies.map((r) => r.id)])
      .join(",");
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      // jump to latest on new message (own or received)
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  }, [threads]);

  return (
    <div className="flex flex-col h-[60vh] min-h-[360px]">
      <div className="sticky top-0 z-10 flex items-center gap-2 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-white/10">
        <MessageSquare className="h-4 w-4 text-dimmer" />
        <h3 className="text-sm font-semibold font-display">Discussion</h3>
        <span className="text-xs text-dimmer">{count}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 flex flex-col">
        {loading ? (
          <div className="text-xs text-dimmer py-4 text-center m-auto">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="text-xs text-dimmer py-6 text-center m-auto">Start the conversation</div>
        ) : (
          <div className="space-y-3 mt-auto">
            {threads.map((t) => (
              <CommentThread key={t.id} thread={t} projectId={projectId} ticketId={ticketId} onChanged={reload} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-white/10 bg-background/95">
        <CommentComposer
          ticketId={ticketId}
          placeholder={user ? "Write a comment…" : "Select a user in the top bar to comment"}
          disabled={!user}
          disabledReason={!user ? "Select a user to comment" : undefined}
          onSubmit={async (body, attachments) => {
            if (!user) return;
            const { error } = await supabase.from("ticket_comments").insert({
              ticket_id: ticketId,
              user_id: user.id,
              parent_id: null,
              body,
              attachments: attachments as any,
            });
            if (error) throw error;
            reload();
          }}
        />
      </div>
    </div>
  );
}
