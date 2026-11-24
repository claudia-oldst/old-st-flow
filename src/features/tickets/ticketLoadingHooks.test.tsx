import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), change: undefined as ((c: any[]) => void) | undefined }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => mocks.rpc(...args) } }));
vi.mock("@/hooks/useRealtimeReload", () => ({ useRealtimeReload: (_tables: unknown, change: (c: any[]) => void) => { mocks.change = change; } }));
import { useProjectTickets } from "./useProjectTickets";
import { PATCH_DEBOUNCE_MS, useTicketListRealtime } from "./useTicketListRealtime";
import { mergeTicketRows } from "./ticketCachePatch";
import { normalizeTicket } from "./useProjectTickets";
const row = (id: string, position: number) => normalizeTicket({ id, position, ticket_number: position, title: id });
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
  it("patches only the changed ticket in place without a full reload", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const rows = [row("a", 1), row("b", 2), row("c", 3)];
    client.setQueryData(["projectTickets", "px"], { tickets: rows, totalCount: 3, complete: true });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    mocks.rpc.mockImplementation((_n: string, args: { _filters: { ticketIds: string[] } }) => ({ abortSignal: () =>
      Promise.resolve({ data: { rows: [{ ...row("b", 2), title: "Edited" }], total: 1 }, error: null }) }));
    renderHook(() => useTicketListRealtime("px"), { wrapper: wrapper(client) });
    await act(async () => { mocks.change?.([{ table: "tickets", eventType: "UPDATE", new: { id: "b" }, old: { id: "b" } }]); await vi.advanceTimersByTimeAsync(PATCH_DEBOUNCE_MS + 1); });
    await vi.waitFor(() => expect((client.getQueryData(["projectTickets", "px"]) as any).tickets[1].title).toBe("Edited"));
    const data = client.getQueryData(["projectTickets", "px"]) as any;
    expect(data.tickets.map((t: any) => t.id)).toEqual(["a", "b", "c"]);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1]._filters).toMatchObject({ ticketIds: ["b"], feedback: false });
    expect(invalidate).not.toHaveBeenCalled();
  });
  it("adds a new ticket by position and removes a deleted one", () => {
    const list = [row("a", 1), row("c", 3)];
    const fresh = new Map([["b", row("b", 2)]]);
    expect(mergeTicketRows(list, ["b", "c"], fresh).map((t) => t.id)).toEqual(["a", "b"]);
  });
  it("a reload never replaces a complete list with a partial page", async () => {
    let finish: ((data: unknown) => void) | undefined;
    mocks.rpc.mockImplementation((_name: string, args: { _page: number }) => ({ abortSignal: () => args._page === 1
      ? Promise.resolve({ data: { rows: Array.from({ length: 200 }, (_, i) => ({ id: `n${i}` })), total: 201 }, error: null })
      : new Promise((resolve) => { finish = resolve; }) }));
    const client = new QueryClient();
    client.setQueryData(["projectTickets", "p3"], { tickets: Array.from({ length: 300 }, (_, i) => row(`o${i}`, i)), totalCount: 300, complete: true });
    const hook = renderHook(() => useProjectTickets("p3"), { wrapper: wrapper(client) });
    await act(async () => { void hook.result.current.reload(); });
    await waitFor(() => expect(finish).toBeDefined());
    expect(hook.result.current.loadedCount).toBe(300);
    await act(async () => { finish?.({ data: { rows: [{ id: "last" }], total: 201 }, error: null }); });
    await waitFor(() => expect(hook.result.current.loadedCount).toBe(201));
  });
  it("keeps downloading after leaving the tab and shows no error on return", async () => {
    let finish: ((data: unknown) => void) | undefined;
    mocks.rpc.mockImplementation((_name: string, args: { _page: number }) => ({ abortSignal: () => args._page === 1
      ? Promise.resolve({ data: { rows: Array.from({ length: 200 }, (_, i) => ({ id: `t${i}` })), total: 201 }, error: null })
      : new Promise((resolve) => { finish = resolve; }) }));
    const client = new QueryClient();
    const first = renderHook(() => useProjectTickets("p2"), { wrapper: wrapper(client) });
    await waitFor(() => expect(first.result.current.loadedCount).toBe(200));
    first.unmount();
    await act(async () => { finish?.({ data: { rows: [{ id: "last" }], total: 201 }, error: null }); });
    const again = renderHook(() => useProjectTickets("p2"), { wrapper: wrapper(client) });
    await waitFor(() => expect(again.result.current.loadedCount).toBe(201));
    expect(again.result.current.error).toBeNull();
  });
});
