import { supabase } from "@/integrations/supabase/client";
import type { CommentAttachment, AttachmentKind } from "./types";

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_FILES = 10;

function detectKind(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export async function uploadCommentAttachment(
  file: File,
  ticketId: string
): Promise<CommentAttachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} exceeds 25 MB limit`);
  }
  const id = crypto.randomUUID();
  const path = `${ticketId}/${id}-${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from("ticket-attachments")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    kind: detectKind(file.type || ""),
  };
}

export async function deleteAttachment(path: string) {
  await supabase.storage.from("ticket-attachments").remove([path]);
}
