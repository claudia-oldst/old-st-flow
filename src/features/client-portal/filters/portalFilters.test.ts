import { describe, expect, it } from "vitest";
import { clampVersions, EMPTY_FILTERS, hasFilters, parsePortalFilters, writePortalFilters } from "./portalFilters";

describe("portal filters", () => {
  it("defaults to All when the link has no filter", () => {
    expect(parsePortalFilters(new URLSearchParams("tab=billing"))).toEqual(EMPTY_FILTERS);
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("round-trips through the link and keeps the tab", () => {
    const f = { types: ["Bug", "CR"], epics: [12, 0], versions: ["v2"] };
    const p = writePortalFilters(new URLSearchParams("tab=summary"), f);
    expect(p.get("tab")).toBe("summary");
    expect(parsePortalFilters(p)).toEqual(f);
  });

  it("ignores unknown ticket types", () => {
    expect(parsePortalFilters(new URLSearchParams("type=Bug,Feedback")).types).toEqual(["Bug"]);
  });

  it("never widens the published version scope", () => {
    expect(clampVersions(["v1", "v3"], ["v1", "v2"])).toEqual(["v1"]);
    expect(clampVersions(["v3"], null)).toEqual(["v3"]);
  });
});
