import { act, renderHook } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTicket } from "@/test/fixtures/tickets";

vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { recordedChains, clearRecordedChains, resetSupabaseHandler } from "@/test/mocks/supabase";
import { useBoardDnd } from "./useBoardDnd";

describe("Feedback board status", () => {
  beforeEach(() => { clearRecordedChains(); resetSupabaseHandler(); });

  it("persists a manually selected overall status without changing development statuses", async () => {
    const ticket = makeTicket({ ticket_type: "Feedback", fe_status: null, be_status: null });
    const reload = vi.fn();
    const { result } = renderHook(() => useBoardDnd({ mode: "project", tickets: [ticket], statuses: [], statusCategoryById: {}, reload }));
    await act(async () => {
      await result.current.handleDragEnd({ active: { id: ticket.id }, over: { id: "s-review" } } as unknown as DragEndEvent);
    });
    expect(recordedChains).toEqual([{ table: "tickets", ops: [
      { fn: "update", args: [{ status_id: "s-review", project_status_override: true }] },
      { fn: "eq", args: ["id", ticket.id] },
    ] }]);
    expect(reload).toHaveBeenCalledOnce();
  });
});