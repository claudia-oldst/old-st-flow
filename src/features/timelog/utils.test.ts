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
