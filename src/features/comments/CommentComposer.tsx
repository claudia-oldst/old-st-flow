import { useRef, useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Send, Loader2, FileText, Film, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadCommentAttachment, MAX_FILES } from "./uploadCommentAttachment";
import type { CommentAttachment } from "./types";
import { commentInputSchema } from "@/lib/schemas/comment";
import { cn } from "@/lib/utils";

interface Props {
  ticketId: string;
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
  const [attachments, setAttachments] = useState<CommentAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(0);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (attachments.length + list.length > MAX_FILES) {
        toast.error(`Max ${MAX_FILES} attachments per comment`);
        return;
      }
      setUploading((n) => n + list.length);
      for (const f of list) {
        try {
          const att = await uploadCommentAttachment(f, ticketId);
          setAttachments((a) => [...a, att]);
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [attachments.length, ticketId]
  );

  const canSend = !disabled && !sending && uploading === 0 && (body.trim().length > 0 || attachments.length > 0);

  const submit = async () => {
    if (!canSend) return;
    const parsed = commentInputSchema.safeParse({ body: body.trim(), attachments });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid comment");
      return;
    }
    setSending(true);
    try {
      await onSubmit(parsed.data.body, attachments);
      setBody("");
      setAttachments([]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg hairline bg-white/[0.02] p-2 transition-colors",
        dragOver && "ring-2 ring-primary/40 bg-primary/5"
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
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={disabled ? disabledReason ?? placeholder : placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 min-h-0"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          if (disabled) return;
          const files: File[] = [];
          for (const item of Array.from(e.clipboardData?.items ?? [])) {
            if (item.kind === "file") {
              const f = item.getAsFile();
              if (f) {
                // Give pasted images a friendlier name
                if (!f.name || f.name === "image.png") {
                  const ext = (f.type.split("/")[1] || "png").replace("+xml", "");
                  files.push(new File([f], `pasted-${Date.now()}.${ext}`, { type: f.type }));
                } else {
                  files.push(f);
                }
              }
            }
          }
          if (files.length > 0) {
            e.preventDefault();
            handleFiles(files);
          }
        }}
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2">
          {attachments.map((a) => (
            <div
              key={a.path}
              className="group relative flex items-center gap-1.5 rounded-md bg-white/5 hairline px-2 py-1 text-xs"
            >
              {a.kind === "image" ? (
                <ImageIcon className="h-3.5 w-3.5 text-dimmer" />
              ) : a.kind === "video" ? (
                <Film className="h-3.5 w-3.5 text-dimmer" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-dimmer" />
              )}
              <span className="max-w-[160px] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((arr) => arr.filter((x) => x.path !== a.path))}
                className="ml-1 text-dimmer hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
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
          {uploading > 0 && (
            <span className="text-xs text-dimmer flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading {uploading}…
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
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
