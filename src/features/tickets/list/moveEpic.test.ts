import { describe, expect, it } from "vitest";
import { moveEpic } from "./moveEpic";

describe("moveEpic", () => {
  it("moves an epic down to the target's place", () => {
    expect(moveEpic([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4]);
  });
  it("moves an epic up to the target's place", () => {
    expect(moveEpic([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3]);
  });
  it("ignores unknown ids", () => {
    expect(moveEpic([1, 2], 9, 1)).toEqual([1, 2]);
  });
});
