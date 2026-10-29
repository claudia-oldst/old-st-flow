import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox } from "lucide-react";
import { TicketsList } from "@/features/tickets/TicketsList";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { EMPTY_FILTERS } from "@/features/tickets/TicketsFilter";
import { useProjectTicketsPaged } from "@/features/tickets/useProjectTicketsPaged";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { ListPagination } from "@/components/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/store/currentUser";

const PAGE_SIZE = 100;
const SORT = { col: "created_at", dir: "desc" } as const;

/** Thalamus Feedback inbox: unconverted Feedback tickets, using the standard list + detail sheet. */
export function ProjectFeedback({ projectId }: { projectId: string }) {
  const user = useCurrentUser((s) => s.user);
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("ticket"));
  const { rows, total, loading, reload } = useProjectTicketsPaged(projectId, {
    filters: EMPTY_FILTERS, search: "", sort: SORT, page, pageSize: PAGE_SIZE, feedback: true,
  });
  const open = useMemo<TicketRow | null>(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  useEffect(() => {
    if (!openId && params.has("ticket")) { params.delete("ticket"); setParams(params, { replace: true }); }
  }, [openId, params, setParams]);

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!rows.length) {
    return (
      <div className="py-16 text-center text-dim text-sm">
        <Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" />
        No feedback waiting. Converted tickets appear in the Tickets tab.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TicketsList tickets={rows} groupBy="none" onOpen={(t) => setOpenId(t.id)} currentUserId={user?.id} projectId={projectId} />
      <ListPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      <TicketDetailSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
        ticket={open}
        projectId={projectId}
        onChange={reload}
      />
    </div>
  );
}
