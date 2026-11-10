import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { recordedChains, clearRecordedChains, resetSupabaseHandler, setSupabaseHandler } from "@/test/mocks/supabase";
import { useBulkTicketActions } from "./useBulkTicketActions";

describe("Feedback bulk overall status", () => {
  beforeEach(() => { clearRecordedChains(); resetSupabaseHandler(); });

  it("updates only selected tickets' overall status and refreshes after success", async () => {
    const refreshed = vi.fn();
    const { result } = renderHook(() => useBulkTicketActions(["fb-1", "fb-2"], vi.fn(), refreshed));
    await act(async () => { await result.current.setStatus("s-review"); });
    expect(recordedChains).toEqual([{ table: "tickets", ops: [
      { fn: "update", args: [{ status_id: "s-review", project_status_override: true }] },
      { fn: "in", args: ["id", ["fb-1", "fb-2"]] },
    ] }]);
    expect(refreshed).toHaveBeenCalledOnce();
  });

  it("does not refresh as if successful when an update fails", async () => {
    setSupabaseHandler(() => ({ data: null, error: { message: "Update denied" } }));
    const refreshed = vi.fn();
    const { result } = renderHook(() => useBulkTicketActions(["fb-1"], vi.fn(), refreshed));
    await act(async () => { await result.current.setStatus("s-review"); });
    expect(refreshed).not.toHaveBeenCalled();
  });
});