import { FileText, Film, Image as ImageIcon, X } from "lucide-react";
import type { CommentAttachment } from "./types";

/** Removable chips for the attachments queued on a comment draft. */
export function AttachmentChips({
  attachments,
  onRemove,
}: {
  attachments: CommentAttachment[];
  onRemove: (path: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
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
            onClick={() => onRemove(a.path)}
            className="ml-1 text-dimmer hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
