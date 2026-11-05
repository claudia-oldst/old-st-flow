import { describe, it, expect, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: any[]) => rpc(...a) } }));

import { fetchProjectTickets } from "./useProjectTickets";

describe("fetchProjectTickets", () => {
  it("loads all 1185 tickets across two calls", async () => {
    const total = 1185;
    rpc.mockImplementation(async (_n: string, args: any) => {
      const start = (args._page - 1) * args._page_size;
      const n = Math.max(0, Math.min(args._page_size, total - start));
      const rows = Array.from({ length: n }, (_, i) => ({ id: `t${start + i}`, assignees: [] }));
      return { data: { rows, total }, error: null };
    });
    const res = await fetchProjectTickets("p");
    expect(res.tickets).toHaveLength(1185);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
