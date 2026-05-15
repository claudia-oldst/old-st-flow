import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPortal } from "@/features/client-portal/usePortalData";
import { PortalView } from "@/features/client-portal/PortalView";
import { PortalChangeRequests } from "@/features/client-portal/PortalChangeRequests";
import { useClientPortalCRsByHash } from "@/features/client-portal/useClientPortalCRs";
import oldStLogo from "@/assets/oldst-logo.png";
import { useEpicDiscounts } from "@/features/discounts/useEpicDiscounts";

export default function ClientPortalPublic() {
  const { hash } = useParams<{ hash: string }>();
  const { data, loading, error } = usePublicPortal(hash);
  const { data: crData, refresh: refreshCR } = useClientPortalCRsByHash(hash);

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
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 h-14 flex items-center">
          <img
            src={oldStLogo}
            alt="Old St Labs"
            className="h-7 w-auto select-none"
            draggable={false}
          />
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10">
        {loading && (
          <div className="text-sm text-dim text-center py-20">Loading…</div>
        )}
        {!loading && (error || !data) && (
          <div className="text-sm text-dim text-center py-20">
            This portal isn't available.
          </div>
        )}
        {data && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="change-requests">Change Requests</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <PortalView payload={data} showRate />
            </TabsContent>
            <TabsContent value="change-requests">
              {crData ? (
                <PortalChangeRequests
                  acronym={crData.project.acronym}
                  epics={crData.epics}
                  baselineTickets={crData.baseline_tickets as any}
                  crTickets={crData.cr_tickets as any}
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
