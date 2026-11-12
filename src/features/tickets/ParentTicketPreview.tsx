import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { ParentRowInfo } from "./ParentOptionRow";

interface Detail {
  acceptance_criteria: string | null;
  version: string | null;
  current_fe_estimate: number | null;
  current_be_estimate: number | null;
  current_project_estimate: number | null;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  children: number;
}

const h = (n: number | null | undefined) => `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}h`;

export function ParentTicketPreview({ id, info }: { id: string; info: ParentRowInfo }) {
  const { data, isPending } = useQuery({
    queryKey: ["parent-preview", id],
    staleTime: 60_000,
    queryFn: async (): Promise<Detail> => {
      const [t, c] = await Promise.all([
        supabase
          .from("tickets")
          .select("acceptance_criteria, version, current_fe_estimate, current_be_estimate, current_project_estimate, actual_frontend_hours, actual_backend_hours, actual_project_hours")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("parent_ticket_id", id),
      ]);
      if (t.error) throw t.error;
      return { ...(t.data as any), children: c.count ?? 0 };
    },
  });

  const rows: [string, number | null | undefined, number | undefined][] = [
    ["FE", data?.current_fe_estimate, data?.actual_frontend_hours],
    ["BE", data?.current_be_estimate, data?.actual_backend_hours],
    ["Project", data?.current_project_estimate, data?.actual_project_hours],
  ];

  return (
    <div className="p-3 space-y-3 text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-dimmer">{info.formatted_id}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{info.ticket_type}</Badge>
        </div>
        <div className="text-sm font-medium leading-snug">{info.title}</div>
        <div className="text-muted-foreground">Epic: {info.epicName ?? "No Epic"}</div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {info.statusName && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.statusColor ?? undefined }} />
              {info.statusName}
            </span>
          )}
          {data?.version && <span className="ml-auto font-mono">{data.version}</span>}
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <div className="grid grid-cols-3 text-muted-foreground mb-1">
          <span>Estimates</span><span className="text-right">Current</span><span className="text-right">Logged</span>
        </div>
        {rows.map(([k, est, act]) => (
          <div key={k} className="grid grid-cols-3 font-mono">
            <span className="font-sans">{k}</span><span className="text-right">{h(est)}</span><span className="text-right">{h(act)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-2">
        <div className="text-muted-foreground mb-1">Acceptance criteria</div>
        {isPending ? (
          <div className="text-dimmer">Loading…</div>
        ) : data?.acceptance_criteria?.trim() ? (
          <p className="whitespace-pre-wrap line-clamp-[12] leading-snug">{data.acceptance_criteria}</p>
        ) : (
          <div className="text-dimmer">None yet</div>
        )}
      </div>
      {data && (
        <div className="border-t border-border pt-2 text-muted-foreground">
          {data.children} child ticket{data.children === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
