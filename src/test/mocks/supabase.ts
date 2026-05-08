/**
 * Chainable Supabase client mock for unit tests.
 *
 * Usage:
 *   import { vi } from "vitest";
 *   vi.mock("@/integrations/supabase/client", () => import("@/test/mocks/supabase"));
 *   import { setSupabaseHandler, resetSupabaseHandler } from "@/test/mocks/supabase";
 *
 *   beforeEach(() => resetSupabaseHandler());
 *   it("does X", async () => {
 *     setSupabaseHandler(({ table, ops }) => {
 *       if (table === "tickets") return { data: [...], error: null };
 *       return { data: [], error: null };
 *     });
 *   });
 *
 * The handler receives the table name and the chained ops in order
 * (e.g. [["select", ["*"]], ["eq", ["id", "abc"]]]).
 * Return { data, error, count? } sync or as a Promise.
 */
import { vi } from "vitest";

export interface Op {
  fn: string;
  args: unknown[];
}
export interface ChainContext {
  table: string;
  ops: Op[];
}
export interface SupabaseResponse {
  data: unknown;
  error: unknown;
  count?: number | null;
}
export type SupabaseHandler = (ctx: ChainContext) => SupabaseResponse | Promise<SupabaseResponse>;

let handler: SupabaseHandler = () => ({ data: [], error: null });

export function setSupabaseHandler(h: SupabaseHandler) {
  handler = h;
}
export function resetSupabaseHandler() {
  handler = () => ({ data: [], error: null });
}

/** Recorded chains for assertions across the test. */
export const recordedChains: ChainContext[] = [];
export function clearRecordedChains() {
  recordedChains.length = 0;
}

function makeBuilder(table: string) {
  const ctx: ChainContext = { table, ops: [] };
  recordedChains.push(ctx);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (v: SupabaseResponse) => unknown, reject?: (e: unknown) => unknown) =>
            Promise.resolve(handler(ctx)).then(resolve, reject);
        }
        if (prop === "catch") {
          return (reject: (e: unknown) => unknown) =>
            Promise.resolve(handler(ctx)).catch(reject);
        }
        if (prop === "finally") {
          return (cb: () => void) => Promise.resolve(handler(ctx)).finally(cb);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (...args: any[]) => {
          ctx.ops.push({ fn: prop, args });
          return builder;
        };
      },
    },
  );
  return builder;
}

const channelStub = {
  on: () => channelStub,
  subscribe: () => ({ unsubscribe: () => {} }),
};

export const supabase = {
  from: vi.fn((table: string) => makeBuilder(table)),
  channel: vi.fn(() => channelStub),
  removeChannel: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;
