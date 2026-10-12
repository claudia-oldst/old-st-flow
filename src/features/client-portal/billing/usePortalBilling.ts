import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BillingPayload } from "./buildBilling";

export type BillingSource =
  | { hash: string }
  | { projectId: string; asOf: Date; versions?: string[] };

/** Billing data for the public portal (by hash) or the PMBA preview. */
export function usePortalBilling(src: BillingSource) {
  const key =
    "hash" in src
      ? ["portalBilling", src.hash]
      : ["portalBilling", src.projectId, src.asOf.toISOString(), (src.versions ?? []).slice().sort().join("|")];
  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<BillingPayload | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpc = supabase.rpc.bind(supabase) as any;
      const { data, error } =
        "hash" in src
          ? await rpc("get_client_portal_billing", { _hash: src.hash })
          : await rpc("get_project_portal_billing", {
              _project_id: src.projectId,
              _cutoff: src.asOf.toISOString(),
              _versions: src.versions ?? [],
            });
      if (error) throw error;
      return (data as BillingPayload) ?? null;
    },
  });
}
