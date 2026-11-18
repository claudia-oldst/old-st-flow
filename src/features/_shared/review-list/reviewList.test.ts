import { describe, it, expect } from "vitest";
import {
  DEFAULT_REVIEW_GROUP, DEFAULT_REVIEW_STATUS, groupReviewItems, historyRange, sortReviewItems,
} from "./reviewList";

const DAY = 86_400_000;
type It = { id: string; epic: string; rank: number; status: string; who: string; at: number; d: number };
const info = (i: It) => ({ epicKey: i.epic, epicName: i.epic, epicRank: i.rank, status: i.status, requesterId: i.who, requesterName: i.who });
const items: It[] = [
  { id: "a", epic: "Login", rank: 1, status: "approved", who: "Zed", at: 3, d: 1 },
  { id: "b", epic: "Admin", rank: 0, status: "pending", who: "Amy", at: 1, d: -5 },
  { id: "c", epic: "Login", rank: 1, status: "pending", who: "Amy", at: 2, d: 2 },
];

describe("review list defaults", () => {
  it("groups by epic and shows pending + approved by default", () => {
    expect(DEFAULT_REVIEW_GROUP).toBe("epic");
    expect(DEFAULT_REVIEW_STATUS).toEqual(["pending", "approved"]);
  });
});

describe("groupReviewItems", () => {
  it("keeps epic order", () => {
    expect(groupReviewItems(items, "epic", info).map((g) => g.title)).toEqual(["Admin", "Login"]);
  });
  it("groups by approval status pending first", () => {
    const g = groupReviewItems(items, "approval", info);
    expect(g.map((x) => [x.title, x.items.length])).toEqual([["Pending", 2], ["Approved", 1]]);
  });
  it("groups by requester A–Z", () => {
    expect(groupReviewItems(items, "requester", info).map((g) => g.title)).toEqual(["Amy", "Zed"]);
  });
  it("none puts everything in one group", () => {
    expect(groupReviewItems(items, "none", info)[0].items).toHaveLength(3);
  });
});

describe("sortReviewItems", () => {
  it("sorts by largest change", () => {
    const s = sortReviewItems(items, "hours", (i) => ({ created: i.at, ticket: i.id, hours: i.d }));
    expect(s.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
});

describe("historyRange", () => {
  it("starts before the first request and ends today", () => {
    const now = 100 * DAY;
    const { start, end } = historyRange([60 * DAY, 80 * DAY], now);
    expect(start).toBeLessThan(60 * DAY);
    expect(start).toBe(58 * DAY);
    expect(end).toBe(now);
  });
});
