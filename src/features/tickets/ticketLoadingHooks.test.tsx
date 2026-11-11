import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), change: undefined as (() => void) | undefined }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => mocks.rpc(...args) } }));
vi.mock("@/hooks/useRealtimeReload", () => ({ useRealtimeReload: (_tables: unknown, change: () => void) => { mocks.change = change; } }));
import { useProjectTickets } from "./useProjectTickets";
import { useTicketListRealtime } from "./useTicketListRealtime";
function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); mocks.rpc.mockReset(); });
describe("ticket loading hooks", () => {
  it("publishes the first 200 tickets before the next page completes, without marking them truncated", async () => {
    let finish: ((data: unknown) => void) | undefined;
    mocks.rpc.mockImplementation((_name: string, args: { _page: number }) => ({ abortSignal: () => args._page === 1
      ? Promise.resolve({ data: { rows: Array.from({ length: 200 }, (_, i) => ({ id: `t${i}` })), total: 201 }, error: null })
      : new Promise((resolve) => { finish = resolve; }) }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const hook = renderHook(() => useProjectTickets("p"), { wrapper: wrapper(client) });
    await waitFor(() => expect(hook.result.current.loadedCount).toBe(200));
    expect(hook.result.current.loadingMore).toBe(true);
    expect(hook.result.current.totalCount).toBe(201);
    expect(hook.result.current.truncated).toBe(false);
    await act(async () => { finish?.({ data: { rows: [{ id: "last" }], total: 201 }, error: null }); });
    await waitFor(() => expect(hook.result.current.loadingMore).toBe(false));
    expect(hook.result.current.loadedCount).toBe(201);
    expect(client.getQueryData(["projectTickets", "p"])).toMatchObject({ complete: true });
  });
  it("debounces changes for three seconds, defers refresh during downloading, then refreshes once", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    renderHook(() => useTicketListRealtime("p", ["projectTickets", "p"]), { wrapper: wrapper(client) });
    let finish: (() => void) | undefined;
    const fetching = client.fetchQuery({ queryKey: ["projectTickets", "p"], queryFn: () => new Promise((resolve) => { finish = () => resolve({ complete: true }); }) });
    await act(async () => {
      mocks.change?.();
      await vi.advanceTimersByTimeAsync(2000);
      mocks.change?.();
      await vi.advanceTimersByTimeAsync(2999);
    });
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { finish?.(); await fetching; });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
