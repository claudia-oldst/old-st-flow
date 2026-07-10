import { z } from "zod";

export const MAX_COMMENT_LENGTH = 5000;
export const MAX_COMMENT_ATTACHMENTS = 10;

export const commentAttachmentSchema = z.object({
  url: z.string().url().or(z.literal("")),
  path: z.string().min(1),
  name: z.string().min(1).max(255),
  mime: z.string().max(255),
  size: z.number().int().nonnegative(),
  kind: z.enum(["image", "video", "file"]),
});

export const commentInputSchema = z
  .object({
    body: z.string().trim().max(MAX_COMMENT_LENGTH, {
      message: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer`,
    }),
    attachments: z
      .array(commentAttachmentSchema)
      .max(MAX_COMMENT_ATTACHMENTS, {
        message: `Max ${MAX_COMMENT_ATTACHMENTS} attachments per comment`,
      }),
  })
  .refine((v) => v.body.length > 0 || v.attachments.length > 0, {
    message: "Comment cannot be empty",
    path: ["body"],
  });

export type CommentInput = z.infer<typeof commentInputSchema>;
