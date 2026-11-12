import { useParams, useSearchParams } from "react-router-dom";
import { parsePortalTab } from "@/features/client-portal/portalTabs";
import { PortalFilterBar } from "@/features/client-portal/filters/PortalFilterBar";
import { parsePortalFilters, writePortalFilters, type PortalFilters } from "@/features/client-portal/filters/portalFilters";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPortal } from "@/features/client-portal/usePortalData";
import { PortalView } from "@/features/client-portal/PortalView";
import { PortalChangeRequests } from "@/features/client-portal/PortalChangeRequests";
import { useClientPortalCRsByHash } from "@/features/client-portal/useClientPortalCRs";
import { PortalTimeline } from "@/features/client-portal/PortalTimeline";
import { PortalBilling } from "@/features/client-portal/billing/PortalBilling";
import oldStLogo from "@/assets/oldst-logo.png";

export default function ClientPortalPublic() {
  const { hash } = useParams<{ hash: string }>();
  const [params, setParams] = useSearchParams();
  // The server also enforces the published version scope.
  const filters = parsePortalFilters(params);
  const { data, loading, error } = usePublicPortal(hash, filters);
  const { data: crData, refresh: refreshCR } = useClientPortalCRsByHash(hash, filters);
  const scope = data?.project.versions ?? [];
  const setFilters = (f: PortalFilters) => setParams(writePortalFilters(params, f), { replace: true });
  const setTab = (tab: string) => {
    const next = new URLSearchParams(params);
    if (tab === "timeline") next.delete("tab"); else next.set("tab", tab);
    setParams(next, { replace: true });
  };

  async function handleApprove(ticketId: string) {
    if (!hash) return;
    const { data: ok, error } = await supabase.rpc("client_approve_cr", {
      _hash: hash,
      _ticket_id: ticketId,
    });
    if (error || !ok) {
      toast.error("Could not approve");
      return;
    }
    toast.success("Change request approved");
    refreshCR();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hairline-b">
        <div className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1440px] px-4 sm:px-6 2xl:px-8 h-14 flex items-center">
          <img
            src={oldStLogo}
            alt="Old St Labs"
            className="h-7 w-auto select-none"
            draggable={false}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1440px] px-4 sm:px-6 2xl:px-8 py-10">
        {loading && !data && (
          <div className="text-sm text-dim text-center py-20">Loading…</div>
        )}
        {!loading && (error || !data) && (
          <div className="text-sm text-dim text-center py-20">
            This portal isn't available.
          </div>
        )}
        {data && (
          <Tabs value={parsePortalTab(params.get("tab"))} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="change-requests">Change Requests</TabsTrigger>
            </TabsList>
            <PortalFilterBar
              value={filters}
              onChange={setFilters}
              epics={crData?.epics ?? []}
              versions={scope.map((v) => ({ value: v, label: v === "_none" ? "No version" : v }))}
            />
            <TabsContent value="timeline">
              <PortalTimeline hash={hash} filters={filters} />
            </TabsContent>
            <TabsContent value="summary">
              <PortalView payload={data} showRate />
            </TabsContent>
            <TabsContent value="billing">
              {hash && <PortalBilling hash={hash} filters={filters} />}
            </TabsContent>
            <TabsContent value="change-requests">
              {crData ? (
                <PortalChangeRequests
                  acronym={crData.project.acronym}
                  epics={crData.epics}
                  baselineTickets={crData.baseline_tickets as never}
                  crTickets={crData.cr_tickets as never}
                  ratePerHour={data.project.rate_per_hour}
                  onApprove={handleApprove}
                />
              ) : (
                <div className="text-sm text-dim text-center py-12">Loading…</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
