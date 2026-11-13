import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EmailFacts } from "../../../../supabase/functions/_shared/clientEmail";
import type { EmailText } from "./buildEmail";

export interface DraftResult { facts: EmailFacts; text: EmailText; projectName: string; sender: string }

export function useClientEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DraftResult | null>(null);

  async function generate(projectId: string, asOf: Date) {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("client-month-email", {
      body: { projectId, asOf: asOf.toISOString() },
    });
    setLoading(false);
    if (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (err as any).context?.json?.().catch(() => null);
      setError(body?.error ?? "Could not draft the email.");
      return;
    }
    setData(res as DraftResult);
  }
  return { loading, error, data, generate };
}
