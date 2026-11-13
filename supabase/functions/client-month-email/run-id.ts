const H = "X-Lovable-AIG-Run-ID";
export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(H)) headers.set(H, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(H)?.trim() || undefined;
      return response;
    },
  };
}
export const getRunId = (req: Request) => req.headers.get(H)?.trim() || undefined;
