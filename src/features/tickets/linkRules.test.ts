import { describe, it, expect } from "vitest";
import { canLink, parentTypesFor, childTypesFor } from "./linkRules";

describe("ticket link rules", () => {
  it("Feedback can have a normal ticket as parent", () => {
    expect(canLink("Feedback", "Bug")).toBe(true);
    expect(canLink("Feedback", "Standard")).toBe(true);
  });
  it("Feedback can have a Feedback parent", () => {
    expect(canLink("Feedback", "Feedback")).toBe(true);
  });
  it("Feedback can have normal or Feedback children", () => {
    expect(childTypesFor("Feedback")).toEqual(["Standard", "Bug", "CR", "Feedback"]);
  });
  it("normal tickets can take Feedback as parent", () => {
    expect(parentTypesFor("Bug")).toContain("Feedback");
  });
  it("Bug still cannot parent a normal ticket", () => {
    expect(canLink("Standard", "Bug")).toBe(false);
  });
  it("Proj never links", () => {
    expect(canLink("Feedback", "Proj")).toBe(false);
  });
});

import { canCreateBugChild } from "./linkRules";
describe("canCreateBugChild", () => {
  it("allows Standard and CR parents only", () => {
    expect(canCreateBugChild("Standard")).toBe(true);
    expect(canCreateBugChild("CR")).toBe(true);
    expect(canCreateBugChild("Bug")).toBe(false);
    expect(canCreateBugChild("Proj")).toBe(false);
  });
});
