import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CommentAttachment } from "./types";
import { commentInputSchema } from "@/lib/schemas/comment";
import { cn } from "@/lib/utils";
import { MentionList } from "./MentionList";
import { useMentionInput } from "./useMentionInput";
import { useCommentAttachments, filesFromClipboard } from "./useCommentAttachments";
import { AttachmentChips } from "./AttachmentChips";

interface Props {
  ticketId: string;
  projectId?: string;
  initialBody?: string;
  initialAttachments?: CommentAttachment[];
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
  submitLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  onSubmit: (body: string, attachments: CommentAttachment[]) => Promise<void> | void;
  onCancel?: () => void;
}

export function CommentComposer({
  ticketId,
  projectId,
  initialBody = "",
  initialAttachments = [],
  placeholder = "Write a comment…",
  compact = false,
  autoFocus = false,
  submitLabel = "Comment",
  disabled = false,
  disabledReason,
  onSubmit,
  onCancel,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const att = useCommentAttachments(ticketId, initialAttachments);
  const m = useMentionInput({ projectId, body, setBody, textareaRef });

  const canSend =
    !disabled &&
    !sending &&
    att.uploading === 0 &&
    (body.trim().length > 0 || att.attachments.length > 0);

  const submit = async () => {
    if (!canSend) return;
    const parsed = commentInputSchema.safeParse({
      body: body.trim(),
      attachments: att.attachments,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid comment");
      return;
    }
    setSending(true);
    try {
      await onSubmit(parsed.data.body, att.attachments);
      setBody("");
      att.setAttachments([]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg hairline bg-white/[0.02] p-2 transition-colors",
        dragOver && "ring-2 ring-primary/40 bg-primary/5",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        if (e.dataTransfer.files?.length) att.handleFiles(e.dataTransfer.files);
      }}
    >
      {m.menuOpen && (
        <MentionList items={m.suggestions} activeIndex={m.activeIndex} onPick={m.insertMention} />
      )}
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          m.syncMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => {
          const el = e.currentTarget;
          m.syncMention(el.value, el.selectionStart ?? 0);
        }}
        onBlur={m.closeMention}
        placeholder={disabled ? (disabledReason ?? placeholder) : placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 min-h-0"
        onKeyDown={(e) => {
          if (m.handleKeyDown(e)) return;
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        onKeyUp={(e) => {
          const el = e.currentTarget;
          m.syncMention(el.value, el.selectionStart ?? 0);
        }}
        onPaste={(e) => {
          if (disabled) return;
          const files = filesFromClipboard(e.clipboardData?.items);
          if (files.length > 0) {
            e.preventDefault();
            att.handleFiles(files);
          }
        }}
      />

      <AttachmentChips attachments={att.attachments} onRemove={att.remove} />

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) att.handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
            title="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          {att.uploading > 0 && (
            <span className="text-xs text-dimmer flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading {att.uploading}…
            </span>
          )}
          {disabled && disabledReason && (
            <span className="text-xs text-dimmer">{disabledReason}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="button" size="sm" onClick={submit} disabled={!canSend}>
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
