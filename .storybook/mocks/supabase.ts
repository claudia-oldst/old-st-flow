/**
 * Storybook mock for `@/integrations/supabase/client`.
 *
 * The real module constructs a live Supabase client (with hardcoded prod
 * credentials) at import time, so any query fired on mount would hit the real
 * backend. This chainable, thenable no-op returns empty, non-throwing responses
 * for queries / mutations / auth / realtime so data-driven composites render in
 * isolation with zero network.
 */

type AnyRecord = Record<string, unknown>;

const emptyResult = { data: [], error: null, count: 0 };
const emptySingle = { data: null, error: null };

// A query builder where every method returns `this` and the object is awaitable.
function makeQueryBuilder() {
  const builder: AnyRecord = {};
  const chainMethods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is",
    "in", "contains", "containedBy", "range", "overlaps", "match",
    "not", "or", "filter", "order", "limit", "single", "maybeSingle",
    "csv", "geojson", "explain", "returns", "abortSignal", "throwOnError",
  ];
  for (const m of chainMethods) {
    builder[m] = () => {
      // `single`/`maybeSingle` resolve to a single-row shape; others to a list.
      if (m === "single" || m === "maybeSingle") {
        return makeThenable(emptySingle);
      }
      return builder;
    };
  }
  // Make the builder itself awaitable (resolves to a list result).
  builder.then = (resolve: (v: typeof emptyResult) => unknown) =>
    Promise.resolve(emptyResult).then(resolve);
  return builder;
}

function makeThenable<T>(value: T) {
  return {
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  };
}

const channel = {
  on: () => channel,
  subscribe: () => channel,
  unsubscribe: () => Promise.resolve("ok"),
  send: () => Promise.resolve("ok"),
};

export const supabase = {
  from: () => makeQueryBuilder(),
  rpc: () => makeThenable(emptyResult),
  channel: () => channel,
  removeChannel: () => Promise.resolve("ok"),
  removeAllChannels: () => Promise.resolve("ok"),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      createSignedUrl: () => Promise.resolve({ data: { signedUrl: "" }, error: null }),
      remove: () => Promise.resolve({ data: null, error: null }),
    }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
} as unknown as typeof import("../../src/integrations/supabase/client").supabase;
