import { describe, it, expect } from "vitest";
import { epicSummarySchema, MAX_PORTAL_SUMMARY } from "./clientPortal";

describe("epicSummarySchema", () => {
  it("accepts an empty summary", () => {
    expect(epicSummarySchema.safeParse({ text: "", included: false }).success).toBe(true);
  });

  it("accepts a normal summary", () => {
    expect(epicSummarySchema.safeParse({ text: "hello", included: true }).success).toBe(true);
  });

  it("rejects summary over max length", () => {
    expect(
      epicSummarySchema.safeParse({
        text: "x".repeat(MAX_PORTAL_SUMMARY + 1),
        included: true,
      }).success,
    ).toBe(false);
  });

  it("rejects non-boolean included", () => {
    expect(
      epicSummarySchema.safeParse({ text: "hi", included: "yes" as unknown as boolean }).success,
    ).toBe(false);
  });
});
