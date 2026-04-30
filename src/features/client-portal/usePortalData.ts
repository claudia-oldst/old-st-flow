import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortalPayload } from "./types";

/**
 * Compute the live portal payload for a project at a given cutoff date.
 * Used inside the PMBA editor to preview the dashboard for any "as of" date,
 * without requiring data to be published.
 *
 * It temporarily mirrors the server RPC by aggregating directly. To keep the
 * code simple and consistent we instead update the project's
 * `client_visibility_cutoff` to the requested date and then call the RPC.
 * That makes the editor behave exactly like the public page.
 */
export function usePortalPreview(projectId: string, hash: string | null, asOf: Date) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hash) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    // Push the cutoff so the RPC sees the requested as-of date.
    const { error: upErr } = await supabase
      .from("projects")
      .update({ client_visibility_cutoff: asOf.toISOString() })
      .eq("id", projectId);
    if (upErr) {
      setError(upErr.message);
      setLoading(false);
      return;
    }
    const { data: payload, error: rpcErr } = await supabase.rpc("get_client_portal", {
      _hash: hash,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setData(null);
    } else {
      setData(payload as unknown as PortalPayload);
    }
    setLoading(false);
  }, [projectId, hash, asOf]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

/** Read-only fetch for the public /h/:hash page. */
export function usePublicPortal(hash: string | undefined) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: payload, error: err } = await supabase.rpc("get_client_portal", {
        _hash: hash,
      });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setData(null);
      } else if (!payload) {
        setError("Portal not found or not enabled.");
      } else {
        setData(payload as unknown as PortalPayload);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  return { data, loading, error };
}
