import { useParams } from "react-router-dom";
import { usePublicPortal } from "@/features/client-portal/usePortalData";
import { PortalView } from "@/features/client-portal/PortalView";
import oldStLogo from "@/assets/oldst-logo.png";

export default function ClientPortalPublic() {
  const { hash } = useParams<{ hash: string }>();
  const { data, loading, error } = usePublicPortal(hash);

  return (
    <div className="min-h-screen bg-background">
      <header className="hairline-b">
        <div className="mx-auto max-w-[880px] px-4 sm:px-6 h-14 flex items-center">
          <img
            src={oldStLogo}
            alt="Old St Labs"
            className="h-7 w-auto select-none"
            draggable={false}
          />
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-4 sm:px-6 py-10">
        {loading && (
          <div className="text-sm text-dim text-center py-20">Loading…</div>
        )}
        {!loading && (error || !data) && (
          <div className="text-sm text-dim text-center py-20">
            This portal isn't available.
          </div>
        )}
        {data && <PortalView payload={data} showRate />}
      </main>
    </div>
  );
}
