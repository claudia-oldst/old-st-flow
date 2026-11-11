import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: any[]) => rpc(...a) } }));

import { fetchProjectTickets, normalizeTicket } from "./useProjectTickets";
import { TICKET_PAGE_TIMEOUT } from "./ticketPageRequest";

describe("fetchProjectTickets", () => {
  beforeEach(() => rpc.mockReset());
  afterEach(() => vi.useRealTimers());
  it("loads all 1185 tickets in six 200-row pages and publishes progress", async () => {
    const total = 1185;
    rpc.mockImplementation((_n: string, args: any) => ({ abortSignal: async () => {
      const start = (args._page - 1) * args._page_size;
      const n = Math.max(0, Math.min(args._page_size, total - start));
      const rows = Array.from({ length: n }, (_, i) => ({ id: `t${start + i}`, assignees: [] }));
      return { data: { rows, total }, error: null };
    } }));
    const onProgress = vi.fn();
    const res = await fetchProjectTickets("p", { onProgress });
    expect(res.tickets).toHaveLength(1185);
    expect(rpc).toHaveBeenCalledTimes(6);
    expect(rpc.mock.calls.map((c) => c[1]._page_size)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(onProgress.mock.calls.map(([r]) => r.tickets.length)).toEqual([200, 400, 600, 800, 1000, 1185]);
    expect(onProgress.mock.calls.every(([r]) => r.totalCount === 1185 && r.complete === false)).toBe(true);
    expect(res.complete).toBe(true);
    expect(new Set(res.tickets.map((t) => t.id)).size).toBe(1185);
  });

  it("distinguishes unloaded criteria from an explicitly empty value", () => {
    expect(normalizeTicket({}).acceptance_criteria).toBeUndefined();
    expect(normalizeTicket({ acceptance_criteria: null }).acceptance_criteria).toBeNull();
    expect(normalizeTicket({ acceptance_criteria: "Existing criteria" }).acceptance_criteria).toBe("Existing criteria");
  });

  it("does not cut off a slow page at the old 30-second limit", async () => {
    vi.useFakeTimers();
    rpc.mockImplementation(() => ({ abortSignal: () => new Promise((resolve) => {
      setTimeout(() => resolve({ data: { rows: [{ id: "slow" }], total: 1 }, error: null }), 45_000);
    }) }));
    const result = fetchProjectTickets("p");
    await vi.advanceTimersByTimeAsync(45_000);
    expect((await result).tickets[0].id).toBe("slow");
  });

  it("aborts each page at 60 seconds and makes only three attempts with 2s/4s backoff", async () => {
    vi.useFakeTimers();
    rpc.mockImplementation(() => ({ abortSignal: (signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("page aborted")), { once: true });
    }) }));
    const result = fetchProjectTickets("p").catch((error) => error);
    await vi.advanceTimersByTimeAsync(TICKET_PAGE_TIMEOUT - 1);
    expect(rpc).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1 + 1999);
    expect(rpc).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(rpc).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(TICKET_PAGE_TIMEOUT + 3999);
    expect(rpc).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(rpc).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(TICKET_PAGE_TIMEOUT);
    expect((await result).message).toBe("page aborted");
  });

  it("cancelling stops an in-flight page without retrying or publishing progress", async () => {
    const controller = new AbortController();
    rpc.mockImplementation(() => ({ abortSignal: (signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    }) }));
    const onProgress = vi.fn();
    const result = fetchProjectTickets("p", { signal: controller.signal, onProgress });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(onProgress).not.toHaveBeenCalled();
  });
});
