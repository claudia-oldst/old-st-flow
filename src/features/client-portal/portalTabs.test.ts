import { describe, it, expect } from "vitest";
import { parsePortalTab, portalLink } from "./portalTabs";

describe("portal tabs", () => {
  it("keeps a valid tab", () => expect(parsePortalTab("billing")).toBe("billing"));
  it("falls back to timeline", () => {
    expect(parsePortalTab("nope")).toBe("timeline");
    expect(parsePortalTab(null)).toBe("timeline");
  });
  it("adds the tab to the share link", () => {
    expect(portalLink("https://x", "abc", "billing")).toBe("https://x/h/abc?tab=billing");
    expect(portalLink("https://x", "abc", "timeline")).toBe("https://x/h/abc");
  });
});
