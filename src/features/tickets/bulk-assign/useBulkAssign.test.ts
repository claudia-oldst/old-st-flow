import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import {
  setSupabaseHandler,
  resetSupabaseHandler,
  recordedChains,
  clearRecordedChains,
  type ChainContext,
} from "@/test/mocks/supabase";
import { useBulkAssign } from "./useBulkAssign";
import { toast } from "sonner";

const TICKET_IDS = ["t-1", "t-2"];

describe("useBulkAssign", () => {
  beforeEach(() => {
    resetSupabaseHandler();
    clearRecordedChains();
    vi.clearAllMocks();
  });

  function setupHappyPath() {
    setSupabaseHandler((ctx: ChainContext) => {
      // initial loads when dialog opens
      if (ctx.table === "project_members" && ctx.ops[0]?.fn === "select") {
        return {
          data: [
            { user_id: "u-fe", role: "Frontend", member: { id: "u-fe", name: "Fia" } },
            { user_id: "u-be", role: "Backend", member: { id: "u-be", name: "Ben" } },
          ],
          error: null,
        };
      }
      if (
        ctx.table === "tickets" &&
        ctx.ops.some((o) => o.fn === "select" && String(o.args[0]).includes("ticket_type"))
      ) {
        return {
          data: [
            { id: "t-1", ticket_type: "Standard" },
            { id: "t-2", ticket_type: "Standard" },
          ],
          error: null,
        };
      }
      // existing assignees lookup before insert (mode=add) → none yet
      if (ctx.table === "ticket_assignees" && ctx.ops[0]?.fn === "select") {
        return { data: [], error: null };
      }
      return { data: [], error: null };
    });
  }

  it("rejects save when no assignees picked in add mode", async () => {
    setupHappyPath();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useBulkAssign({ open: true, projectId: "p-1", ticketIds: TICKET_IDS, onSaved, onClose }),
    );
    await waitFor(() => expect(result.current.feEligible.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(toast.error).toHaveBeenCalledWith("Pick at least one assignee");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("inserts FE assignee rows for each standard ticket and resets BE statuses for un-staffed", async () => {
    setupHappyPath();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useBulkAssign({ open: true, projectId: "p-1", ticketIds: TICKET_IDS, onSaved, onClose }),
    );
    await waitFor(() => expect(result.current.feEligible.length).toBe(1));

    act(() => {
      result.current.toggle(result.current.feUserIds, result.current.setFeUserIds, "u-fe");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Find the insert into ticket_assignees
    const insertChain = recordedChains.find(
      (c) => c.table === "ticket_assignees" && c.ops[0]?.fn === "insert",
    );
    expect(insertChain).toBeTruthy();
    const inserted = insertChain!.ops[0].args[0] as Array<{
      ticket_id: string;
      user_id: string;
      slot: string;
    }>;
    expect(inserted).toHaveLength(2);
    expect(inserted.every((r) => r.slot === "FE" && r.user_id === "u-fe")).toBe(true);
    expect(new Set(inserted.map((r) => r.ticket_id))).toEqual(new Set(TICKET_IDS));

    expect(toast.success).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("computes totalPicked and ticket type buckets", async () => {
    setupHappyPath();
    const { result } = renderHook(() =>
      useBulkAssign({
        open: true,
        projectId: "p-1",
        ticketIds: TICKET_IDS,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    await waitFor(() => expect(result.current.hasStandard).toBe(true));
    expect(result.current.hasProj).toBe(false);
    expect(result.current.totalPicked).toBe(0);
    act(() => {
      result.current.toggle(result.current.feUserIds, result.current.setFeUserIds, "u-fe");
      result.current.toggle(result.current.beUserIds, result.current.setBeUserIds, "u-be");
    });
    expect(result.current.totalPicked).toBe(2);
  });
});
