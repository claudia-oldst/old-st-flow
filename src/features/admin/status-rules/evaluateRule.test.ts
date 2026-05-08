import { describe, it, expect } from "vitest";
import { evaluateRule, findWinningRule } from "./evaluateRule";

const r = (
  fe: string[],
  be: string[],
  op: "AND" | "OR" = "AND",
  status_id = "x",
) => ({
  fe_statuses: fe as never,
  be_statuses: be as never,
  operator: op,
  status_id,
});

describe("evaluateRule", () => {
  it("AND matches when both sides match", () => {
    expect(evaluateRule(r(["done"], ["done"]), "done" as never, "done" as never)).toBe(true);
  });

  it("AND fails when one side misses", () => {
    expect(evaluateRule(r(["done"], ["done"]), "done" as never, "todo" as never)).toBe(false);
  });

  it("OR matches when either side matches", () => {
    expect(
      evaluateRule(r(["done"], ["done"], "OR"), "done" as never, "todo" as never),
    ).toBe(true);
  });

  it("OR fails when neither side matches", () => {
    expect(
      evaluateRule(r(["done"], ["done"], "OR"), "todo" as never, "todo" as never),
    ).toBe(false);
  });

  it("empty fe_statuses acts as a wildcard", () => {
    expect(evaluateRule(r([], ["done"]), "todo" as never, "done" as never)).toBe(true);
  });

  it("empty be_statuses acts as a wildcard", () => {
    expect(evaluateRule(r(["todo"], []), "todo" as never, "in_progress" as never)).toBe(true);
  });
});

describe("findWinningRule", () => {
  it("returns null when nothing matches", () => {
    expect(
      findWinningRule(
        [r(["done"], ["done"])],
        "todo" as never,
        "todo" as never,
      ),
    ).toBeNull();
  });

  it("first match wins (ordering matters)", () => {
    const a = r(["todo"], [], "AND", "A");
    const b = r(["todo"], [], "AND", "B");
    expect(findWinningRule([a, b], "todo" as never, "todo" as never)?.status_id).toBe("A");
  });
});
