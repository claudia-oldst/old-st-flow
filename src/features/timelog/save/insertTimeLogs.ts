import { supabase } from "@/integrations/supabase/client";

type Row = Record<string, unknown>;
type Result = { error: { message: string } | null };
type Inserter = (rows: Row[]) => PromiseLike<{ error: { code?: string; message: string } | null }>;

const inFlight = new Map<string, Promise<Result>>();

const defaultInsert: Inserter = (rows) => supabase.from("time_logs").insert(rows as any);

/**
 * Insert time logs once. Identical payloads sent while one is in flight share the same
 * request (double clicks), and each row gets a client id so a retried request that
 * already landed is treated as success instead of creating a duplicate.
 */
export function insertTimeLogsOnce(rows: Row[], insert: Inserter = defaultInsert): Promise<Result> {
  const key = JSON.stringify(rows);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const withIds = rows.map((r) => ({ id: (r.id as string) ?? crypto.randomUUID(), ...r }));
  const run = (async (): Promise<Result> => {
    const { error } = await insert(withIds);
    if (error && error.code !== "23505") return { error };
    return { error: null };
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}
