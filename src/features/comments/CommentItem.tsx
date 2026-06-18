import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole, canManageTickets } from "@/features/team/useProjectRole";
import { Reply, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CommentComposer } from "./CommentComposer";
import { deleteAttachment } from "./uploadCommentAttachment";
import type { CommentRow } from "./types";
import { AttachmentView } from "./AttachmentView";
import { markdownComponents, relTime } from "./commentMarkdown";

interface Props {
  comment: CommentRow;
  projectId: string;
  ticketId: string;
  onReply?: () => void;
  onChanged: () => void;
  isReply?: boolean;
}

export function CommentItem({ comment, projectId, ticketId, onReply, onChanged }: Props) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const [editing, setEditing] = useState(false);

  const isAuthor = user?.id === comment.user_id;
  const canDelete = isAuthor || canManageTickets(role);
  const canEdit = isAuthor;

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment?")) return;
    // best-effort attachment cleanup
    for (const a of comment.attachments) {
      try {
        await deleteAttachment(a.path);
      } catch {
        /* ignore */
      }
    }
    const { error } = await supabase.from("ticket_comments").delete().eq("id", comment.id);
    if (error) toast.error(error.message);
    else onChanged();
  };

  if (editing) {
    return (
      <div className="flex gap-2.5">
        <div title={comment.author?.name ?? "Unknown"}>
          <MemberAvatar
            name={comment.author?.name ?? "?"}
            color={comment.author?.avatar_color ?? "#6366f1"}
            size="xs"
          />
        </div>
        <div className="flex-1 min-w-0">
          <CommentComposer
            ticketId={ticketId}
            initialBody={comment.body}
            initialAttachments={comment.attachments}
            submitLabel="Save"
            autoFocus
            compact
            onCancel={() => setEditing(false)}
            onSubmit={async (body, attachments) => {
              const { error } = await supabase
                .from("ticket_comments")
                .update({ body, attachments: attachments as unknown as Json, edited_at: new Date().toISOString() })
                .eq("id", comment.id);
              if (error) throw error;
              setEditing(false);
              onChanged();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 group">
      <div title={comment.author?.name ?? "Unknown"}>
        <MemberAvatar
          name={comment.author?.name ?? "?"}
          color={comment.author?.avatar_color ?? "#6366f1"}
          size="xs"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[11px] text-dimmer">{relTime(comment.created_at)}</span>
          {comment.edited_at && <span className="text-[11px] text-dimmer">(edited)</span>}
        </div>
        {comment.body && (
          <div className="prose prose-invert prose-xs max-w-none mt-0.5 break-words text-xs leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:text-xs [&_li]:text-xs [&_code]:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{comment.body}</ReactMarkdown>
          </div>
        )}
        {comment.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {comment.attachments.map((a) => (
              <AttachmentView key={a.path} a={a} />
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onReply}>
              <Reply className="h-3 w-3" /> Reply
            </Button>
          )}
          {canEdit && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
