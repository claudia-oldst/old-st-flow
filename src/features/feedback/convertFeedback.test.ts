import { describe, it, expect } from "vitest";
import { buildConvertPatch } from "./convertFeedback";
import { newDraft } from "@/features/tickets/add-dialog/types";

const base = () => ({ ...newDraft("s1", "Standard"), title: "Fix login", epicId: 1 });

describe("buildConvertPatch", () => {
  it("rejects a Bug without a parent", () => {
    expect(buildConvertPatch({ ...base(), type: "Bug" })).toEqual({ error: "A bug needs a parent ticket" });
  });
  it("moves FE/BE hours into project hours for Proj", () => {
    const r = buildConvertPatch({ ...base(), type: "Proj", fe: "2", be: "3" }) as any;
    expect(r.patch.current_project_estimate).toBe(5);
    expect(r.patch.current_fe_estimate).toBeNull();
  });
  it("requires an epic", () => {
    expect(buildConvertPatch({ ...base(), epicId: null })).toEqual({ error: "Choose an epic" });
  });
});
