import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PageArgs = Database["public"]["Functions"]["list_project_tickets"]["Args"];
export const TICKET_PAGE_TIMEOUT = 60_000;
export const TICKET_PAGE_ATTEMPTS = 3;

export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Cancelled", "AbortError"));
    const cancel = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", cancel); resolve(); }, ms);
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/** Retry each page, not the already downloaded project. Cancellation stops retries too. */
export async function requestTicketPage(args: PageArgs, signal?: AbortSignal) {
  for (let attempt = 0; attempt < TICKET_PAGE_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, TICKET_PAGE_TIMEOUT);
    try {
      const { data, error } = await supabase.rpc("list_project_tickets", args).abortSignal(controller.signal);
      if (error) throw new Error(`Could not load tickets: ${error.message}`);
      return data;
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (attempt === TICKET_PAGE_ATTEMPTS - 1) throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
    await abortableDelay(2_000 * (attempt + 1), signal);
  }
  throw new Error("Could not load tickets");
}
