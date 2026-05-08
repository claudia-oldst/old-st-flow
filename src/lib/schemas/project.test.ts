import { describe, it, expect } from "vitest";
import { projectDetailsSchema, MAX_PROJECT_NAME } from "./project";

const ok = {
  name: "Acme",
  acronym: "ACM",
  client_name: "Acme Ltd",
  rate_per_hour: 100,
  start_date: null,
  links: [{ name: "Figma", url: "https://figma.com/file/abc" }],
};

describe("projectDetailsSchema", () => {
  it("accepts a valid project", () => {
    expect(projectDetailsSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(projectDetailsSchema.safeParse({ ...ok, name: "  " }).success).toBe(false);
  });

  it("rejects name over max", () => {
    expect(
      projectDetailsSchema.safeParse({ ...ok, name: "x".repeat(MAX_PROJECT_NAME + 1) }).success,
    ).toBe(false);
  });

  it("rejects negative rate", () => {
    expect(projectDetailsSchema.safeParse({ ...ok, rate_per_hour: -1 }).success).toBe(false);
  });

  it("rejects link with invalid URL", () => {
    expect(
      projectDetailsSchema.safeParse({ ...ok, links: [{ name: "x", url: "not-a-url" }] }).success,
    ).toBe(false);
  });

  it("accepts no links", () => {
    expect(projectDetailsSchema.safeParse({ ...ok, links: [] }).success).toBe(true);
  });
});
