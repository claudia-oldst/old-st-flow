import { describe, it, expect } from "vitest";
import { makeHash } from "./makeHash";

describe("makeHash", () => {
  it("returns a 16-character string", () => {
    expect(makeHash()).toHaveLength(16);
  });

  it("only uses base36 characters (0-9, a-z)", () => {
    expect(makeHash()).toMatch(/^[0-9a-z]{16}$/);
  });

  it("produces unique values across 1k calls", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(makeHash());
    expect(set.size).toBe(1000);
  });
});
