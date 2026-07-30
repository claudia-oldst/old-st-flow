import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"));
import { setSupabaseHandler, resetSupabaseHandler } from "@/test/mocks/supabase";
import { useNotificationPrefs } from "./useNotificationPrefs";

describe("useNotificationPrefs", () => {
  beforeEach(() => resetSupabaseHandler());

  it("treats a missing row as enabled and an explicit false as muted", async () => {
    setSupabaseHandler(({ table }) => {
      if (table === "project_notification_prefs") {
        return { data: [{ user_id: "muted-user", slack_enabled: false }], error: null };
      }
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useNotificationPrefs("p1", true));
    await waitFor(() => expect(result.current.isEnabled("muted-user")).toBe(false));
    expect(result.current.isEnabled("someone-else")).toBe(true);
  });

  it("optimistically flips a toggle", async () => {
    setSupabaseHandler(() => ({ data: [], error: null }));
    const { result } = renderHook(() => useNotificationPrefs("p1", true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setEnabled("u1", false);
    });
    expect(result.current.isEnabled("u1")).toBe(false);
  });
});
