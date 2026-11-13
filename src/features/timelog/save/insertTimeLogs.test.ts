import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { insertTimeLogsOnce } from "./insertTimeLogs";

describe("insertTimeLogsOnce", () => {
  it("saving the same log twice at once sends only one insert", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const row = { ticket_id: "t", hours: 1 };
    await Promise.all([insertTimeLogsOnce([row], insert), insertTimeLogsOnce([row], insert)]);
    expect(insert).toHaveBeenCalledTimes(1);
  });
  it("treats an already-saved log (duplicate id) as success", async () => {
    const insert = vi.fn(async () => ({ error: { code: "23505", message: "dup" } }));
    expect((await insertTimeLogsOnce([{ ticket_id: "x" }], insert)).error).toBeNull();
  });
});
