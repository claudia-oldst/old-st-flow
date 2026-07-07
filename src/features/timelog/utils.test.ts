import { describe, it, expect } from "vitest";
import { evenSplit, hoursMinutesToDecimal, decimalToHoursMinutes } from "./utils";

describe("evenSplit", () => {
  it("returns empty array for n=0", () => {
    expect(evenSplit(120, 0)).toEqual([]);
  });

  it("splits evenly when divisible", () => {
    expect(evenSplit(60, 3)).toEqual([20, 20, 20]);
  });

  it("puts remainder on the first row", () => {
    expect(evenSplit(61, 3)).toEqual([21, 20, 20]);
    expect(evenSplit(7, 2)).toEqual([4, 3]);
  });

  it("handles total smaller than n", () => {
    expect(evenSplit(2, 5)).toEqual([2, 0, 0, 0, 0]);
  });

  it("sums back to total", () => {
    const out = evenSplit(123, 7);
    expect(out.reduce((a, b) => a + b, 0)).toBe(123);
    expect(out).toHaveLength(7);
  });

  it("handles total of 0", () => {
    expect(evenSplit(0, 4)).toEqual([0, 0, 0, 0]);
  });
});

describe("hoursMinutesToDecimal", () => {
  it("combines hours and minutes", () => {
    expect(hoursMinutesToDecimal("1", "30")).toBe(1.5);
    expect(hoursMinutesToDecimal("0", "45")).toBe(0.75);
    expect(hoursMinutesToDecimal("2", "0")).toBe(2);
    expect(hoursMinutesToDecimal("", "15")).toBe(0.25);
    expect(hoursMinutesToDecimal("3", "")).toBe(3);
  });
  it("treats empty/invalid as 0", () => {
    expect(hoursMinutesToDecimal("", "")).toBe(0);
    expect(hoursMinutesToDecimal("abc", "xyz")).toBe(0);
  });
});

describe("decimalToHoursMinutes", () => {
  it("splits decimals", () => {
    expect(decimalToHoursMinutes(1.25)).toEqual({ h: 1, m: 15 });
    expect(decimalToHoursMinutes(1.5)).toEqual({ h: 1, m: 30 });
    expect(decimalToHoursMinutes(0.5)).toEqual({ h: 0, m: 30 });
    expect(decimalToHoursMinutes(2.75)).toEqual({ h: 2, m: 45 });
    expect(decimalToHoursMinutes(2)).toEqual({ h: 2, m: 0 });
  });
  it("returns zeros for non-positive input", () => {
    expect(decimalToHoursMinutes(0)).toEqual({ h: 0, m: 0 });
    expect(decimalToHoursMinutes(-1)).toEqual({ h: 0, m: 0 });
  });
  it("round-trips", () => {
    for (const v of [0.5, 1.5, 2.75, 0.25]) {
      const { h, m } = decimalToHoursMinutes(v);
      expect(hoursMinutesToDecimal(String(h), String(m))).toBe(v);
    }
  });
});
