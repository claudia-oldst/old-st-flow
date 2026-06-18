/**
 * Formats Supabase / PostgrestError-shaped objects (and anything else) into a
 * human-readable string suitable for a toast. Always logs the raw error to the
 * console so the full payload is available in devtools.
 */
export function formatSupabaseError(err: unknown): string {
  // Always surface the raw error for debugging.
  // eslint-disable-next-line no-console
  console.error("[supabase]", err);

  if (err instanceof Error) return err.message;

  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    if (typeof e.message === "string" && e.message.length > 0) {
      const parts: string[] = [e.message];
      if (typeof e.code === "string" && e.code) parts[0] += ` (${e.code})`;
      if (typeof e.hint === "string" && e.hint) parts.push(e.hint);
      else if (typeof e.details === "string" && e.details) parts.push(e.details);
      return parts.join(" — ");
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}
