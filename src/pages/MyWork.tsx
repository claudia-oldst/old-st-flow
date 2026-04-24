import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { displayTitle, formatHours } from "@/lib/utils";
import { ListChecks, ArrowRight } from "lucide-react";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import type { DisciplineStatus } from "@/lib/types";

interface Row {
  id: string;
  formatted_id: string;
  title: string;
  ticket_type: "Standard" | "Bug" | "CR";
  status_id: string | null;
  fe_status: DisciplineStatus;
  be_status: DisciplineStatus;
  est_frontend_hours: number;
  est_backend_hours: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  project: { id: string; name: string; acronym: string };
  status: { name: string; color: string; category: string } | null;
  slot: "FE" | "BE";
}

export default function MyWork() {
  const user = useCurrentUser((s) => s.user);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ticket_assignees")
      .select(
        "slot,ticket:tickets(id,formatted_id,title,ticket_type,status_id,fe_status,be_status,est_frontend_hours,est_backend_hours,actual_frontend_hours,actual_backend_hours,project:projects(id,name,acronym),status:statuses(name,color,category))"
      )
      .eq("user_id", user.id)
      .then(({ data }) => {
        const flat: Row[] =
          (data as any)?.map((d: any) => ({
            ...d.ticket,
            project: d.ticket.project,
            status: d.ticket.status,
            slot: d.slot,
            est_frontend_hours: Number(d.ticket.est_frontend_hours),
            est_backend_hours: Number(d.ticket.est_backend_hours),
            actual_frontend_hours: Number(d.ticket.actual_frontend_hours),
            actual_backend_hours: Number(d.ticket.actual_backend_hours),
          })) ?? [];
        // Filter out done
        setRows(flat.filter((r) => r.status?.category !== "done"));
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-[1480px] px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">{user?.name ?? "—"}</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-7 w-7" /> My Work
        </h1>
        <p className="text-dim mt-1">Open tickets assigned to you across all projects.</p>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <ListChecks className="h-10 w-10 mx-auto text-dimmer mb-4" />
          <div className="text-lg font-medium">Nothing on your plate</div>
          <div className="text-dim text-sm mt-1">No tickets currently assigned to you.</div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {rows.map((r) => {
              const isFE = r.slot === "FE";
              const actual = isFE ? r.actual_frontend_hours : r.actual_backend_hours;
              const estimate = isFE ? r.est_frontend_hours : r.est_backend_hours;
              return (
                <Link
                  key={`${r.id}-${r.slot}`}
                  to={`/projects/${r.project.id}`}
                  className="group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition"
                >
                  <div className="font-mono text-xs text-dimmer w-20">{r.formatted_id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{displayTitle(r.title, r.ticket_type)}</div>
                    <div className="text-xs text-dim flex items-center gap-2 mt-0.5">
                      <span>{r.project.name}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {r.status && <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.status.color }} />}
                        {r.status?.name}
                      </span>
                    </div>
                  </div>
                  <DisciplineStatusChip slot={r.slot} status={isFE ? r.fe_status : r.be_status} />
                  <div className="text-xs font-mono text-dim w-24 text-right">
                    {formatHours(actual)} / {formatHours(estimate)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-dimmer group-hover:text-foreground transition" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
