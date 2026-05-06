import type { TeamMember } from "@/lib/types";

export type AttachmentKind = "image" | "video" | "file";

export interface CommentAttachment {
  url: string;
  path: string;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
}

export interface CommentRow {
  id: string;
  ticket_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  attachments: CommentAttachment[];
  edited_at: string | null;
  created_at: string;
  author: TeamMember | null;
}

export interface CommentThreadNode extends CommentRow {
  replies: CommentRow[];
}
