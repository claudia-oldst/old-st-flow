import { describe, it, expect } from "vitest";
import { commentInputSchema, MAX_COMMENT_LENGTH } from "./comment";

const att = {
  url: "https://example.com/x.png",
  path: "tickets/1/x.png",
  name: "x.png",
  mime: "image/png",
  size: 100,
  kind: "image" as const,
};

describe("commentInputSchema", () => {
  it("accepts a non-empty body with no attachments", () => {
    const r = commentInputSchema.safeParse({ body: "hello", attachments: [] });
    expect(r.success).toBe(true);
  });

  it("accepts an empty body if there is at least one attachment", () => {
    const r = commentInputSchema.safeParse({ body: "", attachments: [att] });
    expect(r.success).toBe(true);
  });

  it("rejects empty body with no attachments", () => {
    const r = commentInputSchema.safeParse({ body: "   ", attachments: [] });
    expect(r.success).toBe(false);
  });

  it("rejects body over the max length", () => {
    const r = commentInputSchema.safeParse({
      body: "x".repeat(MAX_COMMENT_LENGTH + 1),
      attachments: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 10 attachments", () => {
    const r = commentInputSchema.safeParse({
      body: "ok",
      attachments: Array.from({ length: 11 }, () => att),
    });
    expect(r.success).toBe(false);
  });
});
