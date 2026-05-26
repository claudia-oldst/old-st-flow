import { describe, it, expect } from "vitest";
import { cn, initials, formatHours, formatDuration, healthRatio, displayTitle } from "./utils";

describe("cn", () => {
  it("merges class names and dedupes conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("initials", () => {
  it("returns up to two upper-case initials from a name", () => {
    expect(initials("Alice Cooper")).toBe("AC");
    expect(initials("alice cooper smith")).toBe("AC");
  });

  it("handles single-word names and extra whitespace", () => {
    expect(initials("Madonna")).toBe("M");
    expect(initials("   john   doe   ")).toBe("JD");
  });

  it("returns empty string for empty input", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });
});

describe("formatHours", () => {
  it("returns '0h' for zero or negative", () => {
    expect(formatHours(0)).toBe("0h");
    expect(formatHours(-1)).toBe("0h");
  });

  it("renders sub-hour values as rounded minutes", () => {
    expect(formatHours(0.5)).toBe("30m");
    expect(formatHours(0.25)).toBe("15m");
  });

  it("renders whole hours without decimals and fractional with one", () => {
    expect(formatHours(4)).toBe("4h");
    expect(formatHours(2.5)).toBe("2.5h");
  });
});

describe("formatDuration", () => {
  it("formats ms as HH:MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(61_000)).toBe("00:01:01");
    expect(formatDuration(3_661_000)).toBe("01:01:01");
  });

  it("clamps negatives to zero", () => {
    expect(formatDuration(-5000)).toBe("00:00:00");
  });
});

describe("healthRatio", () => {
  it("returns 'none' when there is no estimate and no actual", () => {
    expect(healthRatio(0, 0)).toBe("none");
  });

  it("returns 'warn' when actuals exist with no estimate", () => {
    expect(healthRatio(2, 0)).toBe("warn");
  });

  it("bands ratios: good <0.8, warn 0.8–<1, bad >=1", () => {
    expect(healthRatio(5, 10)).toBe("good");
    expect(healthRatio(8, 10)).toBe("warn");
    expect(healthRatio(9.9, 10)).toBe("warn");
    expect(healthRatio(10, 10)).toBe("bad");
    expect(healthRatio(15, 10)).toBe("bad");
  });
});

describe("displayTitle", () => {
  it("prefixes Bug and CR titles, leaves others untouched", () => {
    expect(displayTitle("Crash on save", "Bug")).toBe("[BUG] Crash on save");
    expect(displayTitle("Add new flow", "CR")).toBe("[CR] Add new flow");
    expect(displayTitle("Discovery", "Proj")).toBe("Discovery");
    expect(displayTitle("Implement X", "Standard")).toBe("Implement X");
  });
});
