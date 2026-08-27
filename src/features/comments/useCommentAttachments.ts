import { useCallback, useState } from "react";
import { toast } from "sonner";
import { uploadCommentAttachment, MAX_FILES } from "./uploadCommentAttachment";
import type { CommentAttachment } from "./types";

/** Extract files from a paste event, giving pasted images a friendlier name. */
export function filesFromClipboard(items: DataTransferItemList | undefined): File[] {
  const files: File[] = [];
  for (const item of Array.from(items ?? [])) {
    if (item.kind !== "file") continue;
    const f = item.getAsFile();
    if (!f) continue;
    if (!f.name || f.name === "image.png") {
      const ext = (f.type.split("/")[1] || "png").replace("+xml", "");
      files.push(new File([f], `pasted-${Date.now()}.${ext}`, { type: f.type }));
    } else {
      files.push(f);
    }
  }
  return files;
}

/** Upload/removal state for comment attachments. */
export function useCommentAttachments(ticketId: string, initial: CommentAttachment[] = []) {
  const [attachments, setAttachments] = useState<CommentAttachment[]>(initial);
  const [uploading, setUploading] = useState(0);

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
    [attachments.length, ticketId],
  );

  const remove = (path: string) => setAttachments((arr) => arr.filter((x) => x.path !== path));

  return { attachments, setAttachments, uploading, handleFiles, remove };
}
