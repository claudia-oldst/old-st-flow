import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { CommentItem } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";
import type { CommentThreadNode } from "./types";

interface Props {
  thread: CommentThreadNode;
  projectId: string;
  ticketId: string;
  onChanged: () => void;
}

export function CommentThread({ thread, projectId, ticketId, onChanged }: Props) {
  const user = useCurrentUser((s) => s.user);
  const [replying, setReplying] = useState(false);

  return (
    <div className="rounded-lg hairline bg-white/[0.02] p-3">
      <CommentItem
        comment={thread}
        projectId={projectId}
        ticketId={ticketId}
        onReply={user ? () => setReplying((v) => !v) : undefined}
        onChanged={onChanged}
      />
      {(thread.replies.length > 0 || replying) && (
        <div className="mt-3 ml-7 pl-3 border-l border-white/10 space-y-3">
          {thread.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              projectId={projectId}
              ticketId={ticketId}
              onChanged={onChanged}
              isReply
            />
          ))}
          {replying && user && (
            <CommentComposer
              ticketId={ticketId}
              placeholder="Write a reply…"
              submitLabel="Reply"
              compact
              autoFocus
              onCancel={() => setReplying(false)}
              onSubmit={async (body, attachments) => {
                const { error } = await supabase.from("ticket_comments").insert({
                  ticket_id: ticketId,
                  user_id: user.id,
                  parent_id: thread.id,
                  body,
                  attachments: attachments as unknown as Database["public"]["Tables"]["ticket_comments"]["Insert"]["attachments"],
                });
                if (error) throw error;
                setReplying(false);
                onChanged();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
