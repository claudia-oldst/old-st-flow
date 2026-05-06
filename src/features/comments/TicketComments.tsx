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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-dimmer" />
        <h3 className="text-sm font-semibold font-display">Discussion</h3>
        <span className="text-xs text-dimmer">{count}</span>
      </div>

      <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1">
        {loading ? (
          <div className="text-xs text-dimmer py-4 text-center">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="text-xs text-dimmer py-6 text-center">Start the conversation</div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <CommentThread
                key={t.id}
                thread={t}
                projectId={projectId}
                ticketId={ticketId}
                onChanged={reload}
              />
            ))}
          </div>
        )}
      </div>

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
  );
}
